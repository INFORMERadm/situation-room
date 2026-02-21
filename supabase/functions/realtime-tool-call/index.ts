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

interface ToolCallRequest {
  toolName: string;
  arguments: Record<string, unknown>;
  server: MCPServerConfig;
}

const mcpSessions = new Map<string, string>();

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
      const key = server.apiKey || Deno.env.get("TAVILY_API_KEY");
      if (key) headers["Authorization"] = `Bearer ${key}`;
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

async function initializeMCPSession(server: MCPServerConfig): Promise<string | undefined> {
  const serverKey = server.config?.connectionId
    ? `${server.url}::${server.config.connectionId}`
    : server.url;

  if (mcpSessions.has(serverKey)) {
    return mcpSessions.get(serverKey);
  }

  const { sessionId } = await mcpJsonRpcRequest(server, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "n4-realtime-tool", version: "1.0.0" },
  });

  const finalSessionId = (sessionId as string | undefined) || crypto.randomUUID();
  mcpSessions.set(serverKey, finalSessionId);

  try {
    await mcpJsonRpcRequest(server, "notifications/initialized", {}, finalSessionId);
  } catch {
    // Non-fatal
  }

  return finalSessionId;
}

async function executeMCPTool(
  server: MCPServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const isSmitheryDirect =
      server.url.startsWith("smithery://") ||
      (server.config?.namespace && server.config?.connectionId);

    let sessionId: string | undefined;

    if (!isSmitheryDirect) {
      const serverKey = server.config?.connectionId
        ? `${server.url}::${server.config.connectionId}`
        : server.url;
      sessionId = mcpSessions.get(serverKey) || await initializeMCPSession(server);
    }

    const { result } = await mcpJsonRpcRequest(
      server,
      "tools/call",
      { name: toolName, arguments: args },
      sessionId
    );

    const content = result as { content?: Array<{ text?: string; type?: string }> };
    let resultString: string;
    if (content?.content && Array.isArray(content.content)) {
      resultString = content.content.map((c) => c.text || JSON.stringify(c)).join("\n");
    } else {
      resultString = typeof result === "string" ? result : JSON.stringify(result);
    }

    await supabase.from("mcp_tool_call_logs").insert({
      tool_name: toolName,
      server_url: server.url,
      server_config: server.config || null,
      arguments: args,
      status: "success",
      result: resultString.slice(0, 10000),
      duration_ms: Date.now() - startTime,
    });

    return resultString;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await supabase.from("mcp_tool_call_logs").insert({
      tool_name: toolName,
      server_url: server.url,
      server_config: server.config || null,
      arguments: args,
      status: "error",
      result: errorMessage,
      duration_ms: Date.now() - startTime,
    });

    return `Error: ${errorMessage}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ToolCallRequest = await req.json();
    const { toolName, arguments: args, server } = body;

    if (!toolName || !server) {
      return new Response(
        JSON.stringify({ error: "toolName and server are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await executeMCPTool(server, toolName, args || {});

    return new Response(
      JSON.stringify({ result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("realtime-tool-call error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
