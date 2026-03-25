import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelegramPost {
  id: string;
  text: string;
  date: string;
  images: string[];
}

function parseTelegramHtml(html: string, channelUrl: string): TelegramPost[] {
  const posts: TelegramPost[] = [];
  const msgRegex = /<div class="tgme_widget_message_wrap[^"]*"[^>]*>[\s\S]*?<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = msgRegex.exec(html)) !== null) {
    const block = match[0];
    const postId = match[1];

    let text = "";
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (textMatch) {
      text = textMatch[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }

    let date = "";
    const dateMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    if (dateMatch) {
      date = dateMatch[1];
    }

    const images: string[] = [];
    const imgRegex = /background-image:\s*url\('([^']+)'\)/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(block)) !== null) {
      images.push(imgMatch[1]);
    }
    const imgTagRegex = /<img[^>]+src="([^"]+)"[^>]*class="[^"]*tgme[^"]*"/g;
    while ((imgMatch = imgTagRegex.exec(block)) !== null) {
      images.push(imgMatch[1]);
    }

    if (text || images.length > 0) {
      const parts = postId.split("/");
      const msgNum = parts[parts.length - 1];
      posts.push({
        id: msgNum,
        text,
        date,
        images,
      });
    }
  }

  return posts;
}

async function fetchTelegramChannel(channelUrl: string): Promise<{ posts: TelegramPost[]; channelName: string }> {
  let url = channelUrl.trim();
  if (!url.includes("/s/")) {
    url = url.replace(/\/?$/, "");
    const parts = url.split("/");
    const channel = parts[parts.length - 1];
    url = `https://t.me/s/${channel}`;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Telegram returned ${res.status}`);
  }

  const html = await res.text();
  const posts = parseTelegramHtml(html, url);

  let channelName = "";
  const nameMatch = html.match(/<div class="tgme_channel_info_header_title[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/);
  if (nameMatch) {
    channelName = nameMatch[1].trim();
  }

  return { posts: posts.slice(-50).reverse(), channelName };
}

async function resolveYoutubeUrl(feedUrl: string): Promise<string> {
  const parsed = new URL(feedUrl);
  if (
    parsed.hostname !== "www.youtube.com" &&
    parsed.hostname !== "youtube.com"
  ) {
    return feedUrl;
  }

  if (parsed.pathname.startsWith("/feeds/videos.xml")) {
    return feedUrl;
  }

  const channelMatch = parsed.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
  }

  const handleMatch = parsed.pathname.match(/^\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/@${handle}`)}&format=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        const authorUrl: string = oembed.author_url || "";
        const oembedChannelMatch = authorUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
        if (oembedChannelMatch) {
          return `https://www.youtube.com/feeds/videos.xml?channel_id=${oembedChannelMatch[1]}`;
        }
      }
    } catch {
      // fall through to page scrape
    }

    try {
      const pageRes = await fetch(`https://www.youtube.com/@${handle}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        const patterns = [
          /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/,
          /"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/,
          /channel_id=(UC[a-zA-Z0-9_-]+)/,
          /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/,
          /<meta[^>]+content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/,
        ];

        for (const pattern of patterns) {
          const m = html.match(pattern);
          if (m) {
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${m[1]}`;
          }
        }

        const rssLinkMatch = html.match(
          /<link[^>]+type="application\/rss\+xml"[^>]+href="([^"]+)"/
        );
        if (rssLinkMatch) {
          return rssLinkMatch[1];
        }
      }
    } catch {
      // fall through
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

    const resolveYt = url.searchParams.get("resolve_yt") === "true";
    if (resolveYt) {
      const handle = url.searchParams.get("handle") || "";
      if (!handle) {
        return new Response(
          JSON.stringify({ error: "Missing handle parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const resolved = await resolveYoutubeUrl(`https://www.youtube.com/@${handle}`);
      const isResolved = resolved.includes("/feeds/videos.xml");
      return new Response(
        JSON.stringify({ feedUrl: isResolved ? resolved : null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const isTelegram = url.searchParams.get("telegram") === "true";
    if (isTelegram) {
      const { posts, channelName } = await fetchTelegramChannel(feedUrl);
      return new Response(
        JSON.stringify({ posts, channelName }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=120",
          },
        }
      );
    }

    const resolvedUrl = await resolveYoutubeUrl(feedUrl);

    const resolvedParsed = new URL(resolvedUrl);
    const isYoutubeHandle = (resolvedParsed.hostname === "www.youtube.com" || resolvedParsed.hostname === "youtube.com")
      && resolvedParsed.pathname.startsWith("/@");
    if (isYoutubeHandle) {
      return new Response(
        JSON.stringify({ error: "Could not resolve YouTube channel to RSS feed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isYoutubeFeed = resolvedUrl.includes("youtube.com/feeds/");
    const res = await fetch(resolvedUrl, {
      headers: {
        "User-Agent": isYoutubeFeed
          ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          : "N4-RSS-Proxy/1.0",
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
