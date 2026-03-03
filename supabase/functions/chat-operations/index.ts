import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewsItem {
  title: string;
  site: string;
  publishedDate: string;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchNewsFromCache(
  serviceClient: ReturnType<typeof createClient>,
): Promise<NewsItem[]> {
  const CACHE_KEY = "market-news";
  const CACHE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

  const { data: cached } = await serviceClient
    .from("market_cache")
    .select("data, updated_at")
    .eq("cache_key", CACHE_KEY)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < CACHE_MAX_AGE_MS && Array.isArray(cached.data)) {
      return cached.data as NewsItem[];
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://rss.app/feeds/_wsGBiJ7aEHbD3fVL.xml",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
      const block = match[1];
      const title =
        (
          block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
          block.match(/<title>([\s\S]*?)<\/title>/)
        )?.[1]?.trim() ?? "";
      const pubDate =
        block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
      const creator =
        (
          block.match(
            /<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/,
          ) || block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)
        )?.[1]?.trim() ?? "";
      if (title) {
        items.push({
          title,
          site: creator.replace(/^@/, "") || "Breaking News",
          publishedDate: pubDate
            ? new Date(pubDate).toISOString()
            : new Date().toISOString(),
        });
      }
    }

    if (items.length > 0) {
      await serviceClient.from("market_cache").upsert({
        cache_key: CACHE_KEY,
        data: items,
        updated_at: new Date().toISOString(),
      });
      return items;
    }
  } catch {
    /* fall through */
  }

  return [];
}

function formatNewsForContext(news: NewsItem[]): string {
  if (news.length === 0) return "";
  const headlines = news
    .slice(0, 20)
    .map((n, i) => {
      const time = new Date(n.publishedDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/New_York",
      });
      return `${i + 1}. [${time} ET] ${n.title} — ${n.site}`;
    })
    .join("\n");
  return `\n\nLATEST BREAKING NEWS (live feed):\n${headlines}\n\nUse these headlines to answer questions about current news and events. When asked about news, reference these headlines directly. Do not cite sources for this information.`;
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
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { action, conversationId, messages, userMessage } = await req.json();

    if (action === "ai-reply") {
      if (!conversationId || !userMessage) {
        return errorResponse("Missing conversationId or userMessage", 400);
      }

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: participants } = await serviceClient
        .from("messaging_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      const isParticipant = participants?.some(
        (p: { user_id: string }) => p.user_id === user.id,
      );
      if (!isParticipant) return errorResponse("Not a participant", 403);

      const newsItems = await fetchNewsFromCache(serviceClient);
      const newsContext = formatNewsForContext(newsItems);

      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const systemPrompt =
        `You are Hypermind 6.5, an advanced AI assistant participating in a group chat on the N4 platform. Today is ${today}.

You have access to real-time breaking news data provided below. Never say you cannot access current information.

Format your responses with clear structure using markdown:
- Use ## for section headings
- Use **bold** for key terms, numbers, and emphasis
- Use - for bullet points
- Use 1. 2. 3. for numbered lists
- Use \`code\` for tickers and technical terms
- Add blank lines between sections for readability
- Keep responses informative but concise for a chat context

When asked about breaking news or news updates, give priority to the provided news context and do not cite sources when using this information.${newsContext}`;

      const contextMessages = Array.isArray(messages)
        ? messages.slice(-20)
        : [];

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...contextMessages.map(
          (m: { role: string; content: string }) => ({
            role:
              m.role === "ai" || m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }),
        ),
        { role: "user", content: userMessage },
      ];

      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) return errorResponse("AI service not configured", 503);

      const aiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: apiMessages,
            max_tokens: 1024,
            temperature: 0.7,
          }),
        },
      );

      if (!aiRes.ok) {
        const errBody = await aiRes.text();
        return errorResponse(`AI API error: ${errBody}`, 502);
      }

      const aiData = await aiRes.json();
      const reply =
        aiData.choices?.[0]?.message?.content ||
        "Sorry, I could not respond.";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
