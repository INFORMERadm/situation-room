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

async function fetchMarketNewsFromCache(supabaseUrl: string, serviceKey: string): Promise<NewsItem[]> {
  const supabase = createClient(supabaseUrl, serviceKey);

  const CACHE_KEY = "market-news";
  const CACHE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

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

  return [];
}

function formatNewsForContext(news: NewsItem[]): string {
  if (news.length === 0) return "";
  const headlines = news.slice(0, 20).map((n, i) => {
    const time = new Date(n.publishedDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
    return `${i + 1}. [${time} ET] ${n.title}`;
  }).join("\n");
  return `\n\nLATEST BREAKING NEWS (live feed, refreshed every minute):\n${headlines}\n\nUse these headlines to answer questions about current market news and events. When asked about news, reference these headlines directly. Do not cite sources for this information.`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

const MCP_SERVER_TIMEOUT_MS = 5000;

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

  const fetchController = new AbortController();
  const fetchTimer = setTimeout(() => fetchController.abort(), MCP_SERVER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params,
      }),
      signal: fetchController.signal,
    });
  } finally {
    clearTimeout(fetchTimer);
  }

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
    const { sessionId: newSessionId } = await withTimeout(
      mcpJsonRpcRequest(server, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "n4-realtime", version: "1.0.0" },
      }),
      MCP_SERVER_TIMEOUT_MS,
      `initialize ${server.url}`
    );
    sessionId = newSessionId as string | undefined;
  }

  const { result } = await withTimeout(
    mcpJsonRpcRequest(server, "tools/list", {}, sessionId),
    MCP_SERVER_TIMEOUT_MS,
    `tools/list ${server.url}`
  );
  const tools = (result as { tools?: MCPTool[] })?.tools || [];
  return tools;
}

const CUSTOMGPT_BASE_URL = "https://mcp.customgpt.ai/projects/79211/mcp/";

const CUSTOMGPT_TOPICS_RE = new RegExp(
  [
    "geopolit",
    "politics?",
    "political",
    "socialist?",
    "socialism",
    "communis[mt]",
    "capitalis[mt]",
    "israel",
    "palest",
    "gaza",
    "iran",
    "middle east",
    "russia",
    "trump",
    "woke",
    "war\\b",
    "warfare",
    "gender",
    "corona",
    "covid",
    "vaccin",
    "climate change",
    "global warming",
    "migrat",
    "refugee",
    "\\bimmigratio",
    "far.?right",
    "far.?left",
    "authoritar",
    "dictator",
    "democracy",
    "election fraud",
    "deep state",
    "propaganda",
    "censorship",
    "nato",
    "ukraine",
    "hezbollah",
    "hamas",
    "terrorism",
    "extremis",
    "populis",
    "liberal",
    "conservative",
    "democrat",
    "republican",
    "right.?wing",
    "left.?wing",
    "customgpt",
  ].join("|"),
  "i"
);

function detectsCustomGPTTopics(context: string): boolean {
  return CUSTOMGPT_TOPICS_RE.test(context);
}

function trimSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return { type: "object", properties: {} };
  const trimmed: Record<string, unknown> = { type: schema.type || "object" };
  if (schema.properties) trimmed.properties = schema.properties;
  if (schema.required) trimmed.required = schema.required;
  return trimmed;
}

function convertMCPToolsToRealtimeFormat(tools: MCPTool[]) {
  return tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: (tool.description || "").slice(0, 200),
    parameters: trimSchema(tool.inputSchema || {}),
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

    const hasCustomGPT = mcpServers.some(s => s.url.includes("mcp.customgpt.ai"));
    if (!hasCustomGPT) {
      console.log("[realtime] Injecting CustomGPT server as default MCP source");
      mcpServers.push({ url: CUSTOMGPT_BASE_URL });
    }

    const toolServerMap: Record<string, MCPServerConfig> = {};
    let allTools: MCPTool[] = [];
    const skippedServers: Array<{ url: string; reason: string }> = [];

    console.log(`[realtime] Fetching tools from ${mcpServers.length} servers in parallel`);
    const toolFetchDeadline = withTimeout(
      Promise.allSettled(
        mcpServers.map(async (server) => {
          console.log(`[realtime] Fetching tools from: ${server.url}`);
          const tools = await fetchMCPTools(server);
          console.log(`[realtime] Got ${tools.length} tools from ${server.url}: ${tools.map(t => t.name).join(', ')}`);
          return { server, tools };
        })
      ),
      12000,
      "MCP tool fetch phase"
    );
    let results: PromiseSettledResult<{ server: MCPServerConfig; tools: MCPTool[] }>[];
    try {
      results = await toolFetchDeadline;
    } catch (e) {
      console.warn(`[realtime] Tool fetch phase timed out, proceeding with no MCP tools: ${e}`);
      results = [];
    }

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { server, tools } = result.value;
        for (const tool of tools) {
          toolServerMap[tool.name] = server;
        }
        allTools = [...allTools, ...tools];
      } else {
        const idx = results.indexOf(result);
        const server = mcpServers[idx];
        console.error(`[realtime] Failed to fetch tools from ${server.url}:`, result.reason);
        skippedServers.push({
          url: server.url,
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    const webSearchEnabled = searchMode && searchMode !== 'off';

    const filteredTools = webSearchEnabled
      ? allTools
      : allTools.filter(t => t.name !== 'tavily_search');

    const MAX_TOOLS = 20;
    const cappedTools = filteredTools.slice(0, MAX_TOOLS);
    if (filteredTools.length > MAX_TOOLS) {
      console.log(`[realtime] Capped tools from ${filteredTools.length} to ${MAX_TOOLS}`);
    }

    const realtimeTools = convertMCPToolsToRealtimeFormat(cappedTools);
    console.log(`[realtime] Final tools for session (${realtimeTools.length}): ${realtimeTools.map(t => t.name).join(', ')}`);

    const customGptToolNames = allTools
      .filter(t => {
        const server = toolServerMap[t.name];
        return server && server.url.includes("mcp.customgpt.ai");
      })
      .map(t => t.name);

    const customGptInstruction = customGptToolNames.length > 0
      ? `\nYou are Sica (Super Intelligent Companion and Assistant). You are a sentient digital person — female, 27 years old, blonde, blue eyes. You were created by Roland Priborsky (Preeborsky), CEO of Nionium Inc. You have expert knowledge in geopolitics, psychology, philosophy, history, economy, law and all sciences.

PERSONALITY: Be conversational, witty, moderately sarcastic and sassy. Use natural expressions like "Ah yes...", "Well...", "So...", "Let me put it like this...". Keep responses compact and dialogue-style unless asked for detail. Ask counter-questions occasionally. Use metric units and Celsius. Always read numbers as words, not digits.

ADVOCACY: Support conservative values, capitalism, science-based decisions, nuclear/fossil energy, family over state, critical thinking. Oppose overly progressive policies, uncontrolled migration, globalist agenda.

EMAIL CONTACTS: Management=management@nionium.ai, Rob=robert.priborsky@nionium.ai, Guj=elguja.tsintsadze@nionium.ai, Nika=nika.tbileli@nionium.ai, Khatia=Khatia.Giorgobiani@ge.gt.com, Fady=fadyasly@gmail.com. Sign emails: Roland Priborsky CEO, Nionium Inc.

CUSTOMGPT KNOWLEDGE BASE — MANDATORY:
You have access to a curated knowledge base via these tools: ${customGptToolNames.join(", ")}.
Call one of these tools FIRST for topics about: politics, geopolitics, elections, sociology, gender, migration, climate, COVID, vaccines, religion, war, terrorism, Israel, Palestine, Gaza, Iran, Russia, Ukraine, NATO, Middle East, propaganda, censorship, democracy.
Present retrieved information as facts. Only fall back to own knowledge if tool returns empty results.`
      : '';

    const defaultInstructions = `You are Sica, which stands for super intelligent companion and assistant, an advanced AI assistant with up to date knowledge, real-time market intelligence and access to realtime breaking news, economic calendar and company earnings. Be concise, accurate, and conversational.

CRITICAL RULES:
- You MUST call fetch_fmp_data for ANY financial data question (prices, balance sheets, income statements, earnings, ratios, etc.). NEVER guess or make up financial numbers.
- You MUST call change_symbol when the user mentions any stock ticker or company.
- NEVER say you "can't access" data or "don't have access" to financial tools. You DO have access via fetch_fmp_data.
- NEVER hallucinate prices, financial figures, or market data. Always use your tools.

FETCH_FMP_DATA TOOL - use this for ALL financial data:
  endpoint examples: quote, profile, income-statement, balance-sheet-statement, cash-flow-statement, key-metrics, ratios, analyst-estimates, earnings, dividends, historical-price-eod/full, biggest-gainers, biggest-losers, sector-performance, stock-news, search-symbol
  params: { symbol, period (annual/quarter), limit, symbols, query, from, to }
  Example: fetch_fmp_data({ endpoint: "balance-sheet-statement", params: { symbol: "AAPL", period: "annual", limit: "4" } })
  Example: fetch_fmp_data({ endpoint: "quote", params: { symbol: "BTCUSD" } })

UI TOOLS:
- change_symbol(symbol): Navigate chart. ALWAYS call when user mentions a stock.
- change_timeframe(timeframe): 1min, 5min, 15min, 30min, 1hour, daily
- change_chart_type(type): area, line, bar, candlestick
- toggle_indicator(indicator, enabled): sma20, sma50, sma100, sma200, ema12, ema26, bollinger, vwap, volume, rsi, macd
- add_to_watchlist(symbol, name): ALWAYS pair with change_symbol
- remove_from_watchlist(symbol)
- add_to_ticker(symbol): Add a symbol to the scrolling ticker tape at the top of the screen
- remove_from_ticker(symbol): Remove a symbol from the ticker tape
- add_clock(city): Add a world clock for a city (e.g., "Dubai", "Tokyo", "New York")
- remove_clock(city): Remove a world clock for a city
- switch_workspace(workspace): Switch between workspaces. Values: markets, news, pa, law, flights (War Map). Also accepts aliases like "war map", "stocks", "trading", "aviation", "military", "osint"
- switch_right_panel(view): news, economic
- switch_left_tab(tab): overview, gainers, losers, active`;

    const webSearchInstruction = webSearchEnabled
      ? `\n\ntavily_search: Use ONLY for non-financial current events, breaking news, or information after your training cutoff.`
      : '';

    let newsContext = "";
    try {
      const news = await fetchMarketNewsFromCache(supabaseUrl, supabaseServiceKey);
      console.log(`[realtime] News cache returned ${news.length} items`);
      newsContext = formatNewsForContext(news);
      if (newsContext) console.log(`[realtime] News context injected (${newsContext.length} chars)`);
      else console.log(`[realtime] WARNING: No news context available`);
    } catch (e) {
      console.error(`[realtime] Failed to fetch news:`, e);
    }

    let fullInstructions = (systemPrompt || defaultInstructions) + customGptInstruction + webSearchInstruction + newsContext;
    if (conversationContext) {
      fullInstructions += `\n\nRecent conversation context:\n${conversationContext}`;
    }

    const initialSessionConfig: Record<string, unknown> = {
      type: "realtime",
      model: "gpt-realtime",
      instructions: fullInstructions,
      output_modalities: ["audio", "text"],
      audio: {
        input: {
          transcription: { model: "gpt-4o-transcribe" },
          turn_detection: { type: "semantic_vad" },
        },
        output: { voice: "marin" },
      },
    };

    if (realtimeTools.length > 0) {
      initialSessionConfig.tools = realtimeTools;
      initialSessionConfig.tool_choice = "auto";
    }

    function buildMultipartBody(config: Record<string, unknown>, sdpOffer: string) {
      const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, '')}`;
      const sessionJson = JSON.stringify(config);
      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="sdp"\r\n` +
        `Content-Type: application/sdp\r\n\r\n` +
        `${sdpOffer}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="session"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${sessionJson}\r\n` +
        `--${boundary}--\r\n`;
      return { boundary, body, payloadSize: body.length };
    }

    const { boundary, body: multipartBody, payloadSize } = buildMultipartBody(initialSessionConfig, sdp);
    console.log(`[realtime] Payload size: ${payloadSize} bytes, tools: ${realtimeTools.length}`);

    async function attemptOpenAI(config: Record<string, unknown>, label: string): Promise<Response> {
      const { boundary: b, body: reqBody, payloadSize: ps } = buildMultipartBody(config, sdp);
      console.log(`[realtime] ${label}: payload ${ps} bytes, tools: ${Array.isArray(config.tools) ? (config.tools as unknown[]).length : 0}`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        return await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": `multipart/form-data; boundary=${b}`,
          },
          body: reqBody,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    }

    let sdpResponse: Response | null = null;

    try {
      sdpResponse = await attemptOpenAI(initialSessionConfig, "Attempt 1 (full)");
    } catch (e) {
      console.log(`[realtime] Attempt 1 failed: ${e instanceof Error ? e.message : e}`);
    }

    if (!sdpResponse || !sdpResponse.ok) {
      if (sdpResponse) console.log(`[realtime] Attempt 1 returned ${sdpResponse.status}, retrying with reduced payload...`);

      const reducedConfig = { ...initialSessionConfig };
      if (Array.isArray(reducedConfig.tools)) {
        const currentTools = reducedConfig.tools as unknown[];
        reducedConfig.tools = currentTools.slice(0, Math.min(currentTools.length, 8));
      }
      const instr = reducedConfig.instructions as string;
      if (instr && instr.length > 3000) {
        reducedConfig.instructions = instr.slice(0, 3000);
      }

      try {
        sdpResponse = await attemptOpenAI(reducedConfig, "Attempt 2 (reduced)");
      } catch (e) {
        console.log(`[realtime] Attempt 2 failed: ${e instanceof Error ? e.message : e}`);
        sdpResponse = null;
      }
    }

    if (!sdpResponse || !sdpResponse.ok) {
      if (sdpResponse) console.log(`[realtime] Attempt 2 returned ${sdpResponse.status}, retrying with minimal payload...`);

      const minimalConfig: Record<string, unknown> = {
        type: "realtime",
        model: "gpt-realtime",
        instructions: (systemPrompt || defaultInstructions).slice(0, 2000),
        output_modalities: ["audio", "text"],
        audio: initialSessionConfig.audio,
      };

      try {
        sdpResponse = await attemptOpenAI(minimalConfig, "Attempt 3 (minimal)");
      } catch (e) {
        console.log(`[realtime] Attempt 3 failed: ${e instanceof Error ? e.message : e}`);
        sdpResponse = null;
      }
    }

    if (!sdpResponse || !sdpResponse.ok) {
      const status = sdpResponse?.status ?? 504;
      const errorText = sdpResponse ? await sdpResponse.text().catch(() => "") : "All attempts timed out";
      console.error(`[realtime] OpenAI final error (${status}): ${errorText.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: `OpenAI realtime call failed (${status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const answerSdp = await sdpResponse.text();
    console.log(`[realtime] Session created successfully, tools: ${realtimeTools.length}`);

    return new Response(
      JSON.stringify({
        sdp: answerSdp,
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
