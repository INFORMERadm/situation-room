import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function resolveYoutubeUrl(feedUrl: string): Promise<string> {
  const parsed = new URL(feedUrl);
  if (
    parsed.hostname !== "www.youtube.com" &&
    parsed.hostname !== "youtube.com"
  ) {
    return feedUrl;
  }

  const channelMatch = parsed.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
  }

  const handleMatch = parsed.pathname.match(/^\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    const pageRes = await fetch(`https://www.youtube.com/@${handleMatch[1]}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      const externalIdMatch = html.match(
        /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/
      );
      if (externalIdMatch) {
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${externalIdMatch[1]}`;
      }

      const browseIdMatch = html.match(
        /"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/
      );
      if (browseIdMatch) {
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${browseIdMatch[1]}`;
      }

      const channelIdMeta = html.match(
        /channel_id=([a-zA-Z0-9_-]+)/
      );
      if (channelIdMeta) {
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMeta[1]}`;
      }

      const rssLinkMatch = html.match(
        /<link[^>]+type="application\/rss\+xml"[^>]+href="([^"]+)"/
      );
      if (rssLinkMatch) {
        return rssLinkMatch[1];
      }
    }
  }

  return feedUrl;
}

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

    const resolvedUrl = await resolveYoutubeUrl(feedUrl);

    const res = await fetch(resolvedUrl, {
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
