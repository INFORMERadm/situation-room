import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CHARS = 120000;

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const { getDocument } = await import("npm:pdfjs-dist@4.9.155/legacy/build/pdf.mjs");
    const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ");
      parts.push(pageText);
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

function decodeUTF16LE(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const codePoint = bytes[i] | (bytes[i + 1] << 8);
    result += String.fromCharCode(codePoint);
  }
  return result;
}

async function unzipEntry(buffer: ArrayBuffer, targetPath: string): Promise<string | null> {
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  const entries: Array<{ name: string; start: number; compressedSize: number; uncompressedSize: number; compression: number }> = [];

  while (offset < bytes.length - 4) {
    const sig = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    if (sig !== 0x04034b50) break;

    const compression = bytes[offset + 8] | (bytes[offset + 9] << 8);
    const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
    const uncompressedSize = bytes[offset + 22] | (bytes[offset + 23] << 8) | (bytes[offset + 24] << 16) | (bytes[offset + 25] << 24);
    const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const nameStart = offset + 30;
    const nameBytes = bytes.slice(nameStart, nameStart + nameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = nameStart + nameLen + extraLen;

    entries.push({ name, start: dataStart, compressedSize, uncompressedSize, compression });
    offset = dataStart + compressedSize;
  }

  const entry = entries.find(e => e.name === targetPath || e.name.endsWith("/" + targetPath));
  if (!entry) return null;

  const compressedData = bytes.slice(entry.start, entry.start + entry.compressedSize);

  if (entry.compression === 0) {
    return new TextDecoder().decode(compressedData);
  }

  if (entry.compression === 8) {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(compressedData);
      writer.close();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const out = new Uint8Array(total);
      let pos = 0;
      for (const c of chunks) { out.set(c, pos); pos += c.length; }
      return new TextDecoder().decode(out);
    } catch {
      return null;
    }
  }

  return null;
}

async function getAllZipEntryNames(buffer: ArrayBuffer): Promise<string[]> {
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  const names: string[] = [];

  while (offset < bytes.length - 4) {
    const sig = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    if (sig !== 0x04034b50) break;

    const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
    const nameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const nameStart = offset + 30;
    const nameBytes = bytes.slice(nameStart, nameStart + nameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = nameStart + nameLen + extraLen;

    names.push(name);
    offset = dataStart + compressedSize;
  }

  return names;
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const xml = await unzipEntry(buffer, "word/document.xml");
  if (!xml) return "";
  const text = xml
    .replace(/<w:br[^/]*/gi, "\n")
    .replace(/<w:p[ >]/gi, "\n")
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/gi, "$1 ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

async function extractTextFromXlsx(buffer: ArrayBuffer): Promise<string> {
  const names = await getAllZipEntryNames(buffer);
  const sharedStringsXml = await unzipEntry(buffer, "xl/sharedStrings.xml");
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const matches = sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g);
    for (const m of matches) {
      const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      sharedStrings.push(text);
    }
  }

  const sheetNames = names.filter(n => n.startsWith("xl/worksheets/sheet") && n.endsWith(".xml"));
  const parts: string[] = [];

  for (const sheetName of sheetNames) {
    const xml = await unzipEntry(buffer, sheetName);
    if (!xml) continue;
    const cells = xml.matchAll(/<c r="[^"]*"[^>]*>([\s\S]*?)<\/c>/g);
    const row: string[] = [];
    for (const cell of cells) {
      const typeMatch = cell[0].match(/t="([^"]*)"/);
      const vMatch = cell[1].match(/<v>([^<]*)<\/v>/);
      if (!vMatch) continue;
      const rawVal = vMatch[1];
      let val = rawVal;
      if (typeMatch && typeMatch[1] === "s") {
        const idx = parseInt(rawVal, 10);
        val = sharedStrings[idx] ?? rawVal;
      }
      row.push(val);
    }
    parts.push(row.join("\t"));
  }

  return parts.join("\n");
}

async function extractTextFromPptx(buffer: ArrayBuffer): Promise<string> {
  const names = await getAllZipEntryNames(buffer);
  const slideNames = names
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0");
      return na - nb;
    });

  const parts: string[] = [];
  for (const name of slideNames) {
    const xml = await unzipEntry(buffer, name);
    if (!xml) continue;
    const text = xml
      .replace(/<a:t[^>]*>([^<]*)<\/a:t>/gi, "$1 ")
      .replace(/<a:br\/>/gi, "\n")
      .replace(/<a:p[ >]/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

async function extractText(buffer: ArrayBuffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") {
    return extractTextFromPdf(buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return extractTextFromDocx(buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx"
  ) {
    return extractTextFromXlsx(buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    return extractTextFromPptx(buffer);
  }

  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md" || ext === "markdown") {
    return new TextDecoder().decode(buffer);
  }

  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const sessionId = form.get("sessionId") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File exceeds 100 MB limit" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docId = crypto.randomUUID();
    const storagePath = `${user.id}/${docId}/${file.name}`;

    const { data: insertData, error: insertError } = await supabase
      .from("chat_documents")
      .insert({
        id: docId,
        user_id: user.id,
        session_id: sessionId || null,
        filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        storage_path: storagePath,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create document record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = await file.arrayBuffer();

    let extractedText = "";
    let errorMessage: string | null = null;

    try {
      extractedText = await extractText(buffer, file.type, file.name);
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    if (extractedText.length > MAX_CHARS) {
      extractedText = extractedText.slice(0, MAX_CHARS) + `\n\n[Document truncated — showing first ${MAX_CHARS.toLocaleString()} characters of ${file.name}]`;
    }

    const charCount = extractedText.length;
    const status = errorMessage ? "error" : (charCount > 0 ? "ready" : "error");
    const finalError = errorMessage ?? (charCount === 0 ? "No text could be extracted from this file" : null);

    await supabase
      .from("chat_documents")
      .update({
        extracted_text: extractedText,
        char_count: charCount,
        status,
        error_message: finalError,
      })
      .eq("id", docId);

    const { error: storageError } = await supabase.storage
      .from("chat-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    return new Response(
      JSON.stringify({
        documentId: docId,
        filename: file.name,
        charCount,
        status,
        errorMessage: finalError,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
