import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractOGTags(html: string) {
  const get = (property: string): string => {
    const patterns = [
      new RegExp(
        `<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`,
        "i"
      ),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1];
    }
    return "";
  };

  let title = get("title");
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (m?.[1]) title = m[1].trim();
  }

  let description = get("description");
  if (!description) {
    const m = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    );
    if (m?.[1]) description = m[1];
  }

  return {
    title,
    description,
    image_url: get("image") || null,
    site_name: get("site_name") || null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { url } = await req.json();
    if (!url || typeof url !== "string")
      return errorResponse("Missing url", 400);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cached } = await serviceClient
      .from("link_preview_cache")
      .select("*")
      .eq("url", url)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let html: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; N4LinkPreview/1.0; +https://n4.ai)",
          Accept: "text/html",
        },
      });
      html = await res.text();
    } catch {
      return errorResponse("Failed to fetch URL", 502);
    } finally {
      clearTimeout(timeout);
    }

    const tags = extractOGTags(html);
    const preview = { url, ...tags, fetched_at: new Date().toISOString() };

    await serviceClient
      .from("link_preview_cache")
      .upsert(preview, { onConflict: "url" });

    return new Response(JSON.stringify(preview), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
