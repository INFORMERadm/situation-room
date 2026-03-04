import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const feedUrl = url.searchParams.get("url");

    if (!feedUrl) {
      return new Response(
        JSON.stringify({ error: "Missing url parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(feedUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allowedProtocols = ["http:", "https:"];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: "Only HTTP/HTTPS URLs allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "N4-RSS-Proxy/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: `Feed returned ${res.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await res.text();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
