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

interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  thumbnail: string;
  description: string;
}

function relativeTextToISO(text: string, index: number): string {
  if (!text) return new Date(Date.now() - index * 60000).toISOString();
  const now = Date.now();
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return new Date(now - index * 60000).toISOString();
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms: Record<string, number> = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
    week: 604800000,
    month: 2592000000,
    year: 31536000000,
  };
  const base = now - num * (ms[unit] || 0);
  return new Date(base - index * 60000).toISOString();
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

function resolveYoutubeHandle(feedUrl: string): string | null {
  try {
    const parsed = new URL(feedUrl);
    if (
      parsed.hostname !== "www.youtube.com" &&
      parsed.hostname !== "youtube.com"
    ) {
      return null;
    }

    const feedsMatch = parsed.pathname.match(/^\/feeds\/videos\.xml/);
    if (feedsMatch) {
      const channelId = parsed.searchParams.get("channel_id");
      if (channelId) return channelId;
    }

    const channelMatch = parsed.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];

    const handleMatch = parsed.pathname.match(/^\/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    return null;
  } catch {
    return null;
  }
}

async function fetchYoutubeChannel(channelIdentifier: string): Promise<YouTubeVideo[]> {
  let pageUrl: string;
  if (channelIdentifier.startsWith("@")) {
    pageUrl = `https://www.youtube.com/${channelIdentifier}/videos`;
  } else if (channelIdentifier.startsWith("UC")) {
    pageUrl = `https://www.youtube.com/channel/${channelIdentifier}/videos`;
  } else {
    pageUrl = `https://www.youtube.com/channel/${channelIdentifier}/videos`;
  }

  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`YouTube returned ${res.status}`);
  }

  const html = await res.text();

  const dataMatch = html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
  if (!dataMatch) {
    throw new Error("Could not find ytInitialData on YouTube page");
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataMatch[1]);
  } catch {
    throw new Error("Failed to parse ytInitialData JSON");
  }

  const videos: YouTubeVideo[] = [];

  const tabs = (
    (data.contents as Record<string, unknown>)?.twoColumnBrowseResultsRenderer as Record<string, unknown>
  )?.tabs as Array<Record<string, unknown>> | undefined;

  if (!tabs) return videos;

  for (const tab of tabs) {
    const tabRenderer = tab.tabRenderer as Record<string, unknown> | undefined;
    if (!tabRenderer || tabRenderer.title !== "Videos") continue;

    const richGrid = (tabRenderer.content as Record<string, unknown>)
      ?.richGridRenderer as Record<string, unknown> | undefined;
    if (!richGrid) continue;

    const contents = richGrid.contents as Array<Record<string, unknown>> | undefined;
    if (!contents) continue;

    for (const item of contents) {
      const richItem = item.richItemRenderer as Record<string, unknown> | undefined;
      if (!richItem) continue;

      const vr = (richItem.content as Record<string, unknown>)
        ?.videoRenderer as Record<string, unknown> | undefined;
      if (!vr) continue;

      const videoId = vr.videoId as string || "";
      if (!videoId) continue;

      const titleRuns = (vr.title as Record<string, unknown>)?.runs as Array<Record<string, string>> | undefined;
      const title = titleRuns?.[0]?.text || "";

      const publishedText = (vr.publishedTimeText as Record<string, string>)?.simpleText || "";

      const thumbnails = (vr.thumbnail as Record<string, unknown>)
        ?.thumbnails as Array<Record<string, unknown>> | undefined;
      const thumbnail = thumbnails?.length
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : "";

      const descSnippet = (vr.descriptionSnippet as Record<string, unknown>)
        ?.runs as Array<Record<string, string>> | undefined;
      const description = descSnippet?.map(r => r.text).join("") || "";

      videos.push({
        videoId,
        title,
        published: relativeTextToISO(publishedText, videos.length),
        thumbnail,
        description,
      });

      if (videos.length >= 30) break;
    }
    break;
  }

  return videos;
}

async function resolveHandleToChannelId(handle: string): Promise<string | null> {
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

    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const patterns = [
      /"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/,
      /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/,
      /"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/,
      /channel_id=(UC[a-zA-Z0-9_-]+)/,
      /<meta[^>]+itemprop="channelId"[^>]+content="(UC[a-zA-Z0-9_-]+)"/,
    ];

    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m) return m[1];
    }
  } catch {
    // fall through
  }
  return null;
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
      const channelId = await resolveHandleToChannelId(handle);
      const feedUrl = channelId
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        : null;
      return new Response(
        JSON.stringify({ feedUrl, channelId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isYoutube = url.searchParams.get("youtube") === "true";
    if (isYoutube) {
      const feedUrl = url.searchParams.get("url") || "";
      if (!feedUrl) {
        return new Response(
          JSON.stringify({ error: "Missing url parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const channelIdentifier = resolveYoutubeHandle(feedUrl);
      if (!channelIdentifier) {
        return new Response(
          JSON.stringify({ error: "Could not identify YouTube channel from URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const videos = await fetchYoutubeChannel(channelIdentifier);
      return new Response(
        JSON.stringify({ videos }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=600",
          },
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
