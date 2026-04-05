import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_BYTES = 500 * 1024 * 1024;
const MAX_CHARS = 120000;
const WHISPER_CHUNK_LIMIT = 24 * 1024 * 1024;

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/x-m4a",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function classifyMediaType(mimeType: string): "audio" | "video" | null {
  if (AUDIO_MIME_TYPES.has(mimeType)) return "audio";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";
  const ext = mimeType.split("/").pop()?.toLowerCase() ?? "";
  if (["mpeg", "wav", "mp4", "ogg", "flac", "webm", "x-m4a"].includes(ext)) return "audio";
  if (["quicktime"].includes(ext)) return "video";
  return null;
}

function getWhisperExtension(mimeType: string, filename: string): string {
  const extMap: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mp4",
  };
  return extMap[mimeType] || filename.split(".").pop()?.toLowerCase() || "mp3";
}

async function transcribeChunk(
  audioData: Uint8Array,
  language: string,
  apiKey: string,
  fileExtension: string,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([audioData], { type: "application/octet-stream" });
  formData.append("file", blob, `chunk.${fileExtension}`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "text");
  if (language && language !== "auto") {
    formData.append("language", language);
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Whisper API error: ${errText}`);
  }

  return response.text();
}

async function transcribeFile(
  fileData: Uint8Array,
  language: string,
  apiKey: string,
  fileExtension: string,
): Promise<string> {
  if (fileData.byteLength <= WHISPER_CHUNK_LIMIT) {
    return transcribeChunk(fileData, language, apiKey, fileExtension);
  }

  const chunkCount = Math.ceil(fileData.byteLength / WHISPER_CHUNK_LIMIT);
  const transcripts: string[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const start = i * WHISPER_CHUNK_LIMIT;
    const end = Math.min(start + WHISPER_CHUNK_LIMIT, fileData.byteLength);
    const chunk = fileData.slice(start, end);
    console.log(`[transcribe-media] Transcribing chunk ${i + 1}/${chunkCount} (${chunk.byteLength} bytes)`);
    const text = await transcribeChunk(chunk, language, apiKey, fileExtension);
    transcripts.push(text.trim());
  }

  return transcripts.join("\n\n");
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return errorResponse("OPENAI_API_KEY not configured", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const contentType = req.headers.get("content-type") ?? "";

    let file: File | null = null;
    let sessionId: string | null = null;
    let language = "en";
    let sourceUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      file = form.get("file") as File | null;
      sessionId = form.get("sessionId") as string | null;
      language = (form.get("language") as string) || "en";
      sourceUrl = (form.get("sourceUrl") as string) || null;
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      sessionId = body.sessionId || null;
      language = body.language || "en";
      sourceUrl = body.sourceUrl || null;
    } else {
      return errorResponse("Expected multipart/form-data or application/json", 400);
    }

    if (!file && !sourceUrl) {
      return errorResponse("No file or source URL provided", 400);
    }

    if (!sessionId) {
      return errorResponse("sessionId is required", 400);
    }

    let fileData: Uint8Array;
    let filename: string;
    let mimeType: string;
    let fileSize: number;
    let mediaType: "audio" | "video" | "youtube";

    if (sourceUrl) {
      const ytMatch = sourceUrl.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/,
      );
      if (!ytMatch) {
        return errorResponse("Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...", 400);
      }

      const videoId = ytMatch[1];
      mediaType = "youtube";
      filename = `youtube_${videoId}.mp4`;

      console.log(`[transcribe-media] Downloading YouTube audio for video: ${videoId}`);

      const coResponse = await fetch(`https://co.wuk.sh/api/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          isAudioOnly: true,
          aFormat: "mp3",
          filenamePattern: "basic",
        }),
      });

      if (!coResponse.ok) {
        return errorResponse("Failed to extract audio from YouTube video. The video may be private, age-restricted, or unavailable.", 422);
      }

      const coData = await coResponse.json();
      if (!coData.url) {
        return errorResponse("Could not obtain download URL for this YouTube video.", 422);
      }

      const audioResponse = await fetch(coData.url);
      if (!audioResponse.ok) {
        return errorResponse("Failed to download audio from YouTube.", 502);
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      fileData = new Uint8Array(audioBuffer);
      fileSize = fileData.byteLength;
      mimeType = "audio/mpeg";
      filename = `youtube_${videoId}.mp3`;

      if (fileSize > MAX_BYTES) {
        return errorResponse("YouTube audio exceeds 500 MB limit", 413);
      }

      console.log(`[transcribe-media] Downloaded YouTube audio: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    } else {
      if (file!.size > MAX_BYTES) {
        return errorResponse("File exceeds 500 MB limit", 413);
      }

      mimeType = file!.type;
      filename = file!.name;
      fileSize = file!.size;

      const classified = classifyMediaType(mimeType);
      if (!classified) {
        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) {
          mediaType = "audio";
        } else if (["mp4", "webm", "mov"].includes(ext)) {
          mediaType = "video";
        } else {
          return errorResponse("Unsupported file type. Please upload an audio or video file.", 400);
        }
      } else {
        mediaType = classified;
      }

      const buffer = await file!.arrayBuffer();
      fileData = new Uint8Array(buffer);
    }

    const docId = crypto.randomUUID();
    const storagePath = `${user.id}/${docId}/${filename}`;

    await supabase.from("chat_documents").insert({
      id: docId,
      user_id: user.id,
      session_id: sessionId,
      filename,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      storage_path: storagePath,
      status: "processing",
      media_type: mediaType,
      source_url: sourceUrl,
      transcription_language: language,
    });

    let transcript = "";
    let errorMessage: string | null = null;

    try {
      const ext = getWhisperExtension(mimeType, filename);
      console.log(`[transcribe-media] Starting Whisper transcription: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)} MB, lang=${language})`);
      transcript = await transcribeFile(fileData, language, OPENAI_API_KEY, ext);
      console.log(`[transcribe-media] Transcription complete: ${transcript.length} chars`);
    } catch (e) {
      errorMessage = (e as Error).message;
      console.error(`[transcribe-media] Transcription failed:`, errorMessage);
    }

    if (transcript.length > MAX_CHARS) {
      transcript = transcript.slice(0, MAX_CHARS) + `\n\n[Transcript truncated -- showing first ${MAX_CHARS.toLocaleString()} characters]`;
    }

    const charCount = transcript.length;
    const status = errorMessage ? "error" : (charCount > 0 ? "ready" : "error");
    const finalError = errorMessage ?? (charCount === 0 ? "No speech could be transcribed from this file" : null);

    await supabase.from("chat_documents").update({
      extracted_text: transcript,
      char_count: charCount,
      status,
      error_message: finalError,
    }).eq("id", docId);

    if (!sourceUrl) {
      await supabase.storage.from("chat-documents").upload(storagePath, fileData, {
        contentType: mimeType,
        upsert: false,
      });
    }

    return new Response(
      JSON.stringify({
        documentId: docId,
        filename,
        charCount,
        status,
        errorMessage: finalError,
        mediaType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[transcribe-media] Unhandled error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
