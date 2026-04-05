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

async function fetchYouTubeTranscript(videoId: string, language: string): Promise<string> {
  const innertubeRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: language || "en",
        },
      },
    }),
  });

  if (!innertubeRes.ok) {
    throw new Error("Failed to fetch YouTube video metadata");
  }

  const playerResponse = await innertubeRes.json();

  const playability = playerResponse?.playabilityStatus?.status;
  if (playability === "LOGIN_REQUIRED" || playability === "UNPLAYABLE" || playability === "ERROR") {
    const reason = playerResponse?.playabilityStatus?.reason || "Video is unavailable";
    throw new Error(reason);
  }

  const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error("No captions or subtitles available for this video. Only videos with captions (auto-generated or manual) can be transcribed via URL.");
  }

  let track = captions.find((t: { languageCode: string }) => t.languageCode === language);
  if (!track) {
    track = captions.find((t: { languageCode: string }) => t.languageCode.startsWith(language.split("-")[0]));
  }
  if (!track) {
    track = captions.find((t: { languageCode: string }) => t.languageCode === "en");
  }
  if (!track) {
    track = captions[0];
  }

  const captionUrl = track.baseUrl + "&fmt=srv3";
  console.log(`[transcribe-media] Fetching captions in ${track.languageCode} from YouTube`);

  const captionRes = await fetch(captionUrl);
  if (!captionRes.ok) {
    throw new Error("Failed to download captions from YouTube");
  }

  const captionXml = await captionRes.text();

  const segments: string[] = [];
  const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = textRegex.exec(captionXml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (text) segments.push(text);
  }

  if (segments.length === 0) {
    throw new Error("Captions were found but contained no text");
  }

  return segments.join(" ");
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
      filename = `youtube_${videoId}.txt`;
      mimeType = "text/plain";

      console.log(`[transcribe-media] Fetching YouTube captions for video: ${videoId}`);

      let ytTranscript: string;
      try {
        ytTranscript = await fetchYouTubeTranscript(videoId, language);
      } catch (e) {
        return errorResponse((e as Error).message, 422);
      }

      const textBytes = new TextEncoder().encode(ytTranscript);
      fileData = textBytes;
      fileSize = textBytes.byteLength;

      console.log(`[transcribe-media] YouTube captions fetched: ${ytTranscript.length} chars`);
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

    if (mediaType === "youtube") {
      transcript = new TextDecoder().decode(fileData);
      console.log(`[transcribe-media] Using YouTube captions directly: ${transcript.length} chars`);
    } else {
      try {
        const ext = getWhisperExtension(mimeType, filename);
        console.log(`[transcribe-media] Starting Whisper transcription: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)} MB, lang=${language})`);
        transcript = await transcribeFile(fileData, language, OPENAI_API_KEY, ext);
        console.log(`[transcribe-media] Transcription complete: ${transcript.length} chars`);
      } catch (e) {
        errorMessage = (e as Error).message;
        console.error(`[transcribe-media] Transcription failed:`, errorMessage);
      }
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
