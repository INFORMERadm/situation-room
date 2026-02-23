import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MCPServerConfig {
  url: string;
  apiKey?: string;
  config?: Record<string, unknown>;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ConversationRequest {
  sdp: string;
  systemPrompt?: string;
  conversationContext?: string;
  mcpServers?: MCPServerConfig[];
  userId?: string;
  searchMode?: string;
}

interface NewsItem {
  title: string;
  site: string;
  publishedDate: string;
}

async function fetchMarketNewsWithCache(supabaseUrl: string, serviceKey: string): Promise<NewsItem[]> {
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const supabase = createClient(supabaseUrl, serviceKey);

  const CACHE_KEY = "market-news";
  const CACHE_MAX_AGE_MS = 60_000;

  const { data: cached } = await supabase
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
    const res = await fetch("https://rss.app/feeds/_wsGBiJ7aEHbD3fVL.xml", { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? "";
      const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() ?? "";
      const creator = (block.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/) || block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/))?.[1]?.trim() ?? "";
      if (title) {
        items.push({
          title,
          site: creator.replace(/^@/, "") || "Breaking News",
          publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        });
      }
    }

    if (items.length > 0) {
      await supabase.from("market_cache").upsert({
        cache_key: CACHE_KEY,
        data: items,
        updated_at: new Date().toISOString(),
      });
      return items;
    }
  } catch { /* fall through */ }

  return [];
}

function formatNewsForContext(news: NewsItem[]): string {
  if (news.length === 0) return "";
  const headlines = news.slice(0, 20).map((n, i) => {
    const time = new Date(n.publishedDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
    return `${i + 1}. [${time} ET] ${n.title} — ${n.site}`;
  }).join("\n");
  return `\n\nLATEST MARKET NEWS (live feed, refreshed every minute):\n${headlines}\n\nUse these headlines to answer questions about current market news and events. When asked about news, reference these headlines directly.`;
}

async function mcpJsonRpcRequest(
  server: MCPServerConfig,
  method: string,
  params: Record<string, unknown> = {},
  sessionId?: string
): Promise<{ result: unknown; sessionId?: string }> {
  const isSmitheryDirect =
    server.url.startsWith("smithery://") ||
    (server.config?.namespace && server.config?.connectionId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };

  let targetUrl = server.url;

  if (isSmitheryDirect) {
    const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY");
    targetUrl = `https://api.smithery.ai/connect/${server.config!.namespace}/${server.config!.connectionId}/mcp`;
    if (smitheryApiKey) headers["Authorization"] = `Bearer ${smitheryApiKey}`;
  } else {
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    const isTavily = server.url.includes("mcp.tavily.com");
    const isCustomGPT = server.url.includes("mcp.customgpt.ai");
    const isExa = server.url.includes("mcp.exa.ai");
    const isComposio = server.url.includes("mcp.composio.dev");
    const isSmithery = server.url.includes("server.smithery.ai");
    const isInternalSupabase = server.url.includes("supabase.co/functions/v1/");

    if (isTavily) {
      const tavilyKey = server.apiKey || Deno.env.get("TAVILY_API_KEY");
      if (tavilyKey) headers["Authorization"] = `Bearer ${tavilyKey}`;
      headers["DEFAULT_PARAMETERS"] = JSON.stringify({
        include_images: true,
        search_depth: "advanced",
        max_results: 20,
      });
    } else if (isCustomGPT) {
      const key = server.apiKey || Deno.env.get("CUSTOMGPT_PROJECT_TOKEN") || Deno.env.get("CustomGPT_API_KEY");
      if (key) headers["Authorization"] = `Bearer ${key}`;
    } else if (isExa) {
      const key = server.apiKey || Deno.env.get("EXA_API_KEY");
      if (key) headers["Authorization"] = `Bearer ${key}`;
    } else if (isComposio) {
      const key = server.apiKey || Deno.env.get("COMPOSIO_API_KEY");
      if (key) headers["Authorization"] = `Bearer ${key}`;
    } else if (isSmithery) {
      const key = server.apiKey || Deno.env.get("SMITHERY_API_KEY");
      if (key) headers["Authorization"] = `Bearer ${key}`;
    } else if (isInternalSupabase) {
      const key = Deno.env.get("SUPABASE_ANON_KEY") || "";
      headers["Authorization"] = `Bearer ${key}`;
      headers["apikey"] = key;
    } else if (server.apiKey) {
      headers["Authorization"] = `Bearer ${server.apiKey}`;
    }
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    const lines = text.split("\n");
    let currentData = "";
    let lastResult: unknown = null;

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        currentData += line.slice(6);
      } else if (line.trim() === "" && currentData) {
        try {
          const data = JSON.parse(currentData);
          if (data.result !== undefined) lastResult = data.result;
          if (data.error) throw new Error(`MCP error: ${data.error.message}`);
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
        currentData = "";
      }
    }
    return {
      result: lastResult,
      sessionId: response.headers.get("mcp-session-id") || sessionId,
    };
  }

  const result = await response.json();
  if (result.error) throw new Error(`MCP error: ${result.error.message}`);
  return {
    result: result.result,
    sessionId: response.headers.get("mcp-session-id") || sessionId,
  };
}

async function fetchMCPTools(server: MCPServerConfig): Promise<MCPTool[]> {
  const isSmitheryDirect =
    server.url.startsWith("smithery://") ||
    (server.config?.namespace && server.config?.connectionId);

  let sessionId: string | undefined;

  if (!isSmitheryDirect) {
    const { sessionId: newSessionId } = await mcpJsonRpcRequest(server, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "n4-realtime", version: "1.0.0" },
    });
    sessionId = newSessionId as string | undefined;
  }

  const { result } = await mcpJsonRpcRequest(server, "tools/list", {}, sessionId);
  const tools = (result as { tools?: MCPTool[] })?.tools || [];
  return tools;
}

function convertMCPToolsToRealtimeFormat(tools: MCPTool[]) {
  return tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description || "",
    parameters: tool.inputSchema || { type: "object", properties: {} },
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ConversationRequest = await req.json();
    const { sdp, systemPrompt, conversationContext, mcpServers = [], userId, searchMode } = body;

    if (!sdp) {
      return new Response(
        JSON.stringify({ error: "SDP offer is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (userId && mcpServers.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: userSecrets } = await supabase
        .from("user_secrets")
        .select("key_name, encrypted_value")
        .eq("user_id", userId);

      const secretsMap = new Map(
        (userSecrets || []).map((s: { key_name: string; encrypted_value: string }) => [
          s.key_name,
          s.encrypted_value,
        ])
      );

      const { data: globalServers } = await supabase
        .from("mcp_servers")
        .select("base_url, api_key_name")
        .eq("is_active", true);

      const serverApiKeyMap = new Map(
        (globalServers || []).map((s: { base_url: string; api_key_name: string }) => [
          s.base_url,
          s.api_key_name,
        ])
      );

      for (const server of mcpServers) {
        if (!server.apiKey && !server.config?.namespace) {
          const apiKeyName = serverApiKeyMap.get(server.url);
          if (apiKeyName) {
            const apiKey = secretsMap.get(apiKeyName as string);
            if (apiKey) server.apiKey = apiKey as string;
          }
        }
      }
    }

    const toolServerMap: Record<string, MCPServerConfig> = {};
    let allTools: MCPTool[] = [];
    const skippedServers: Array<{ url: string; reason: string }> = [];

    for (const server of mcpServers) {
      try {
        const tools = await fetchMCPTools(server);
        for (const tool of tools) {
          toolServerMap[tool.name] = server;
        }
        allTools = [...allTools, ...tools];
      } catch (err) {
        skippedServers.push({
          url: server.url,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const webSearchEnabled = searchMode && searchMode !== 'off';

    const filteredTools = webSearchEnabled
      ? allTools
      : allTools.filter(t => t.name !== 'tavily_search');

    const realtimeTools = convertMCPToolsToRealtimeFormat(filteredTools);

    const defaultInstructions = `You are N4, an advanced AI financial assistant with real-time market intelligence. You have access to live market data, financial analysis tools, and can help with trading decisions, market analysis, portfolio management, and financial research. Be concise, accurate, and proactive in providing market insights. When speaking, keep responses brief and conversational.`;

    const webSearchInstruction = webSearchEnabled
      ? `\n\nWEB SEARCH: You have web search available via the tavily_search tool. Only use it when the user's question genuinely requires current or real-time information that you cannot answer from your training data — for example, breaking news, live prices, or today's specific events. Do NOT use web search for greetings, general knowledge questions, conversational exchanges, or anything you can answer confidently without it.`
      : '';

    let newsContext = "";
    try {
      const news = await fetchMarketNewsWithCache(supabaseUrl, supabaseServiceKey);
      newsContext = formatNewsForContext(news);
    } catch { /* non-fatal */ }

    const clientToolInstructions = `\n\nUI CONTROL TOOLS: You have tools to control the trading dashboard. You MUST call these tools when the user requests these actions — never just describe the action.
- change_symbol: Navigate chart to a stock. Call when user mentions a ticker or asks to show/open a stock.
- change_timeframe: Change chart interval (1min, 5min, 15min, 30min, 1hour, daily).
- change_chart_type: Change chart type (area, line, bar, candlestick).
- toggle_indicator: Toggle technical indicators (sma20, sma50, sma100, sma200, ema12, ema26, bollinger, vwap, volume, rsi, macd).
- add_to_watchlist: Add a symbol to the watchlist. Requires both symbol and company name. ALWAYS also call change_symbol for the same symbol.
- remove_from_watchlist: Remove a symbol from the watchlist.
- switch_right_panel: Switch right panel (news, economic).
- switch_left_tab: Switch left tab (overview, gainers, losers, active).
When the user asks about a specific stock, ALWAYS call change_symbol to navigate to it. When adding to watchlist, ALWAYS pair with change_symbol.`;

    let fullInstructions = (systemPrompt || defaultInstructions) + webSearchInstruction + clientToolInstructions + newsContext;
    if (conversationContext) {
      fullInstructions += `\n\nRecent conversation context:\n${conversationContext}`;
    }

    const sessionConfig: Record<string, unknown> = {
      model: "gpt-4o-realtime-preview",
      voice: "marin",
      modalities: ["text", "audio"],
      instructions: fullInstructions,
      input_audio_transcription: {
        model: "whisper-1",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.7,
        prefix_padding_ms: 500,
        silence_duration_ms: 700,
      },
    };

    if (realtimeTools.length > 0) {
      sessionConfig.tools = realtimeTools;
      sessionConfig.tool_choice = "auto";
    }

    const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      return new Response(
        JSON.stringify({ error: `OpenAI session creation failed: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = await sessionResponse.json();
    const ephemeralKey = sessionData.client_secret?.value;

    if (!ephemeralKey) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain ephemeral key from OpenAI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: sdp,
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      return new Response(
        JSON.stringify({ error: `WebRTC SDP exchange failed: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const answerSdp = await sdpResponse.text();

    const clientSessionConfig: Record<string, unknown> = {
      instructions: fullInstructions,
      voice: "marin",
      modalities: ["text", "audio"],
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.7,
        prefix_padding_ms: 500,
        silence_duration_ms: 700,
      },
    };

    if (realtimeTools.length > 0) {
      clientSessionConfig.tools = realtimeTools;
      clientSessionConfig.tool_choice = "auto";
    }

    return new Response(
      JSON.stringify({
        sdp: answerSdp,
        sessionConfig: clientSessionConfig,
        toolServerMap,
        toolCount: realtimeTools.length,
        skippedServers,
        diagnostics: {
          serversReceived: mcpServers.length,
          toolsFetched: allTools.length,
          serversProcessed: mcpServers.length - skippedServers.length,
          serversSkipped: skippedServers.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("realtime-conversation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
