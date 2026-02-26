import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PREFERRED_NAMESPACE = "n4-app";
let resolvedNamespace: string | null = null;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSmitheryApiKey(): string | null {
  const key = Deno.env.get("SMITHERY_API_KEY");
  if (!key || key.trim() === "") return null;
  return key.trim();
}

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const userToken = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(userToken);

  if (error || !user) throw new Error("Invalid user token");
  return { user, supabase };
}

async function smitheryApiCall(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const smitheryApiKey = getSmitheryApiKey();
  if (!smitheryApiKey) throw new Error("SMITHERY_API_KEY is not configured as a Supabase secret. Please set it via the Supabase dashboard under Edge Function Secrets.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${smitheryApiKey}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  return fetch(`https://api.smithery.ai${path}`, options);
}

async function getNamespace(): Promise<string> {
  if (resolvedNamespace) return resolvedNamespace;

  const listRes = await smitheryApiCall("GET", "/namespaces");
  if (listRes.ok) {
    const data = await listRes.json();
    const namespaces: Array<{ name: string }> = data.namespaces || [];
    if (namespaces.length > 0) {
      resolvedNamespace = namespaces[0].name;
      console.log("[smithery-connect] Using existing namespace:", resolvedNamespace);
      return resolvedNamespace;
    }
  }

  const createRes = await smitheryApiCall("PUT", `/namespaces/${PREFERRED_NAMESPACE}`);
  if (createRes.ok || createRes.status === 409) {
    resolvedNamespace = PREFERRED_NAMESPACE;
    console.log("[smithery-connect] Created namespace:", PREFERRED_NAMESPACE);
    return resolvedNamespace;
  }

  const errText = await createRes.text();
  console.error("[smithery-connect] Failed to create namespace:", createRes.status, errText);
  throw new Error(`Failed to resolve Smithery namespace: ${errText}`);
}

async function handleCreate(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const { mcpUrl, displayName } = await req.json();

  if (!mcpUrl || !displayName) {
    return jsonResponse({ error: "mcpUrl and displayName are required" }, 400);
  }

  const namespace = await getNamespace();

  const connectionId = `${user.id}-${Date.now()}`;

  const res = await smitheryApiCall("PUT", `/connect/${namespace}/${connectionId}`, {
    mcpUrl,
    name: displayName,
    metadata: { userId: user.id },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[smithery-connect] Smithery API error:", res.status, errText);
    return jsonResponse(
      { error: `Smithery connection failed (${res.status}): ${errText}` },
      res.status >= 500 ? 502 : res.status
    );
  }

  const connData = await res.json();
  const status =
    connData.status === "auth_required" ? "auth_required" : "connected";

  await supabase.from("user_smithery_connections").upsert(
    {
      user_id: user.id,
      smithery_namespace: namespace,
      smithery_connection_id: connectionId,
      mcp_url: mcpUrl,
      display_name: displayName,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,smithery_connection_id" }
  );

  return jsonResponse({
    connectionId,
    status,
    authorizationUrl: connData.authorizationUrl || null,
    serverInfo: connData.serverInfo || null,
  });
}

async function handleList(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);

  const smitheryApiKey = getSmitheryApiKey();
  if (smitheryApiKey) {
    try {
      const namespace = await getNamespace();
      const res = await smitheryApiCall(
        "GET",
        `/connect/${namespace}?metadata=${encodeURIComponent(JSON.stringify({ userId: user.id }))}`
      );

      if (res.ok) {
        const data = await res.json();
        const smitheryConns: Array<{
          connectionId: string;
          status: string;
          name?: string;
          mcpUrl?: string;
          serverInfo?: unknown;
        }> = data.data || data || [];

        for (const sc of smitheryConns) {
          if (sc.connectionId && sc.status) {
            await supabase
              .from("user_smithery_connections")
              .update({
                status: sc.status === "auth_required" ? "auth_required" : sc.status,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)
              .eq("smithery_connection_id", sc.connectionId);
          }
        }
      } else {
        console.warn("[smithery-connect] Smithery list failed:", res.status);
      }
    } catch (e) {
      console.warn("[smithery-connect] Smithery list call failed:", e);
    }
  }

  const { data: localConns } = await supabase
    .from("user_smithery_connections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return jsonResponse({ connections: localConns || [] });
}

async function handleRemove(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const { connectionId } = await req.json();

  if (!connectionId) {
    return jsonResponse({ error: "connectionId is required" }, 400);
  }

  try {
    const namespace = await getNamespace();
    await smitheryApiCall("DELETE", `/connect/${namespace}/${connectionId}`);
  } catch (e) {
    console.warn("[smithery-connect] Smithery delete failed (non-fatal):", e);
  }

  await supabase
    .from("user_smithery_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("smithery_connection_id", connectionId);

  return jsonResponse({ success: true });
}

async function handleRetry(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const { connectionId } = await req.json();

  if (!connectionId) {
    return jsonResponse({ error: "connectionId is required" }, 400);
  }

  const namespace = await getNamespace();
  const res = await smitheryApiCall(
    "GET",
    `/connect/${namespace}/${connectionId}`
  );

  if (!res.ok) {
    const errText = await res.text();
    return jsonResponse({ error: `Retry failed: ${errText}` }, 502);
  }

  const connData = await res.json();
  const status =
    connData.status === "auth_required" ? "auth_required" : "connected";

  await supabase
    .from("user_smithery_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("smithery_connection_id", connectionId);

  return jsonResponse({
    connectionId,
    status,
    authorizationUrl: connData.authorizationUrl || null,
  });
}

async function handleListTools(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const smitheryApiKey = getSmitheryApiKey();
  if (!smitheryApiKey) {
    return jsonResponse({ error: "SMITHERY_API_KEY is not configured" }, 500);
  }

  const namespace = await getNamespace();

  const { data: connections } = await supabase
    .from("user_smithery_connections")
    .select("smithery_connection_id, display_name, mcp_url")
    .eq("user_id", user.id)
    .eq("status", "connected")
    .eq("smithery_namespace", namespace);

  if (!connections || connections.length === 0) {
    return jsonResponse({ tools: [], servers: [] });
  }

  const allTools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
    serverName: string;
    connectionId: string;
  }> = [];

  const servers: Array<{
    connectionId: string;
    displayName: string;
    toolCount: number;
  }> = [];

  for (const conn of connections) {
    try {
      const res = await fetch(
        `https://api.smithery.ai/connect/${namespace}/${conn.smithery_connection_id}/mcp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${smitheryApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: "tools/list",
            params: {},
          }),
        }
      );

      if (!res.ok) {
        console.warn(
          `[smithery-connect] tools/list failed for ${conn.display_name}:`,
          res.status
        );
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      let result: unknown;

      if (contentType.includes("text/event-stream")) {
        const text = await res.text();
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.result) result = d.result;
            } catch { /* skip */ }
          }
        }
      } else {
        const json = await res.json();
        result = json.result || json;
      }

      const tools = (result as { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> })?.tools || [];

      for (const t of tools) {
        allTools.push({
          name: t.name,
          description: t.description || t.name,
          inputSchema: t.inputSchema || { type: "object", properties: {} },
          serverName: conn.display_name,
          connectionId: conn.smithery_connection_id,
        });
      }

      servers.push({
        connectionId: conn.smithery_connection_id,
        displayName: conn.display_name,
        toolCount: tools.length,
      });
    } catch (e) {
      console.error(
        `[smithery-connect] Error fetching tools for ${conn.display_name}:`,
        e
      );
    }
  }

  return jsonResponse({ tools: allTools, servers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "create":
        return await handleCreate(req);
      case "list":
        return await handleList(req);
      case "remove":
        return await handleRemove(req);
      case "retry":
        return await handleRetry(req);
      case "list-tools":
        return await handleListTools(req);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[smithery-connect] Unhandled error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
