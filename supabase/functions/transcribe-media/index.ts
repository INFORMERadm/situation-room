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

function parseCaptionXml(xml: string): string {
  const segments: string[] = [];
  const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = textRegex.exec(xml)) !== null) {
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
  return segments.join(" ");
}

function pickCaptionTrack(
  captions: { languageCode: string; baseUrl: string }[],
  language: string,
) {
  let track = captions.find((t) => t.languageCode === language);
  if (!track) {
    track = captions.find((t) => t.languageCode.startsWith(language.split("-")[0]));
  }
  if (!track) {
    track = captions.find((t) => t.languageCode === "en");
  }
  if (!track) {
    track = captions[0];
  }
  return track;
}

async function downloadCaptions(baseUrl: string): Promise<string> {
  const captionUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "fmt=srv3";
  const res = await fetch(captionUrl);
  if (!res.ok) {
    throw new Error("Failed to download captions from YouTube");
  }
  const xml = await res.text();
  const text = parseCaptionXml(xml);
  if (!text) {
    throw new Error("Captions were found but contained no text");
  }
  return text;
}

async function tryInnertubeAndroid(videoId: string, language: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip",
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.02.39",
            androidSdkVersion: 34,
            hl: language || "en",
          },
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const status = data?.playabilityStatus?.status;
    if (status !== "OK") return null;

    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const track = pickCaptionTrack(captions, language);
    console.log(`[transcribe-media] InnerTube ANDROID: captions in ${track.languageCode}`);
    return await downloadCaptions(track.baseUrl);
  } catch (e) {
    console.log(`[transcribe-media] InnerTube ANDROID failed: ${(e as Error).message}`);
    return null;
  }
}

async function tryInnertubeIOS(videoId: string, language: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "19.09.3",
            deviceMake: "Apple",
            deviceModel: "iPhone16,2",
            hl: language || "en",
          },
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const status = data?.playabilityStatus?.status;
    if (status !== "OK") return null;

    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const track = pickCaptionTrack(captions, language);
    console.log(`[transcribe-media] InnerTube IOS: captions in ${track.languageCode}`);
    return await downloadCaptions(track.baseUrl);
  } catch (e) {
    console.log(`[transcribe-media] InnerTube IOS failed: ${(e as Error).message}`);
    return null;
  }
}

async function tryEmbedPage(videoId: string, language: string): Promise<string | null> {
  try {
    const embedRes = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!embedRes.ok) return null;
    const html = await embedRes.text();

    const configMatch = html.match(/"captions"\s*:\s*(\{.*?"captionTracks"\s*:\s*\[.*?\]\s*\})/s);
    if (!configMatch) return null;

    let captionsJson: string;
    let depth = 0;
    let start = html.indexOf(configMatch[0]);
    let end = start;
    for (let i = start; i < html.length; i++) {
      if (html[i] === '{') depth++;
      if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    captionsJson = html.slice(start, end);

    const parsed = JSON.parse(`{${captionsJson}}`);
    const captions = parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const track = pickCaptionTrack(captions, language);
    console.log(`[transcribe-media] Embed page: captions in ${track.languageCode}`);
    return await downloadCaptions(track.baseUrl);
  } catch (e) {
    console.log(`[transcribe-media] Embed page failed: ${(e as Error).message}`);
    return null;
  }
}

async function tryTimedTextDirect(videoId: string, language: string): Promise<string | null> {
  const langs = [language, language.split("-")[0], "en"];
  const seen = new Set<string>();

  for (const lang of langs) {
    if (!lang || seen.has(lang)) continue;
    seen.add(lang);

    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.length < 50) continue;

      const text = parseCaptionXml(xml);
      if (text && text.length > 10) {
        console.log(`[transcribe-media] timedtext direct: captions in ${lang}`);
        return text;
      }
    } catch {
      continue;
    }
  }

  for (const lang of langs) {
    if (!lang || seen.has(`asr_${lang}`)) continue;
    seen.add(`asr_${lang}`);

    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&kind=asr&fmt=srv3`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.length < 50) continue;

      const text = parseCaptionXml(xml);
      if (text && text.length > 10) {
        console.log(`[transcribe-media] timedtext ASR: captions in ${lang}`);
        return text;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function tryWatchPageScrape(videoId: string, language: string): Promise<string | null> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!watchRes.ok) return null;
    const html = await watchRes.text();

    const marker = 'var ytInitialPlayerResponse = ';
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) return null;

    const jsonStart = startIdx + marker.length;
    let depth = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === '{') depth++;
      if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === jsonStart) return null;

    const playerResponse = JSON.parse(html.slice(jsonStart, jsonEnd));
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const track = pickCaptionTrack(captions, language);
    console.log(`[transcribe-media] Watch page scrape: captions in ${track.languageCode}`);
    return await downloadCaptions(track.baseUrl);
  } catch (e) {
    console.log(`[transcribe-media] Watch page scrape failed: ${(e as Error).message}`);
    return null;
  }
}

async function fetchYouTubeTranscript(videoId: string, language: string): Promise<string> {
  console.log(`[transcribe-media] Trying multiple strategies for video ${videoId}`);

  const strategies: [string, () => Promise<string | null>][] = [
    ["InnerTube ANDROID", () => tryInnertubeAndroid(videoId, language)],
    ["InnerTube IOS", () => tryInnertubeIOS(videoId, language)],
    ["timedtext direct", () => tryTimedTextDirect(videoId, language)],
    ["Watch page scrape", () => tryWatchPageScrape(videoId, language)],
    ["Embed page", () => tryEmbedPage(videoId, language)],
  ];

  for (const [name, fn] of strategies) {
    console.log(`[transcribe-media] Trying strategy: ${name}`);
    const result = await fn();
    if (result && result.length > 10) {
      console.log(`[transcribe-media] Success with strategy: ${name} (${result.length} chars)`);
      return result;
    }
  }

  throw new Error(
    "Could not retrieve captions for this video. The video may have no captions, or YouTube may be blocking server requests. Try uploading the audio/video file directly instead.",
  );
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
