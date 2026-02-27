import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";
import Smithery from "npm:@smithery/api@0.53.0";

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

function getSmitheryClient(): Smithery {
  const key = Deno.env.get("SMITHERY_API_KEY");
  if (!key || key.trim() === "") {
    throw new Error("SMITHERY_API_KEY is not configured");
  }
  return new Smithery({ bearerToken: key.trim() });
}

function parseConnectionStatus(conn: { status?: unknown }): {
  status: string;
  authorizationUrl: string | null;
} {
  const raw = conn.status as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return { status: "connected", authorizationUrl: null };

  const state = typeof raw.state === "string" ? raw.state : "connected";
  const authUrl = typeof raw.authorizationUrl === "string" ? raw.authorizationUrl : null;
  console.log("[smithery-connect] parseConnectionStatus:", JSON.stringify({ state, authUrl }));
  return { status: state, authorizationUrl: authUrl };
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

async function getNamespace(smithery: Smithery): Promise<string> {
  if (resolvedNamespace) return resolvedNamespace;

  try {
    const list = await smithery.namespaces.list();
    const namespaces = list.namespaces || [];
    if (namespaces.length > 0) {
      resolvedNamespace = namespaces[0].name;
      console.log("[smithery-connect] Using existing namespace:", resolvedNamespace);
      return resolvedNamespace;
    }
  } catch (e) {
    console.warn("[smithery-connect] List namespaces failed:", e);
  }

  try {
    await smithery.namespaces.set(PREFERRED_NAMESPACE);
    resolvedNamespace = PREFERRED_NAMESPACE;
    console.log("[smithery-connect] Created namespace:", PREFERRED_NAMESPACE);
    return resolvedNamespace;
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 409) {
      resolvedNamespace = PREFERRED_NAMESPACE;
      return resolvedNamespace;
    }
    throw e;
  }
}

async function handleCreate(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const { mcpUrl, displayName } = await req.json();

  if (!mcpUrl || !displayName) {
    return jsonResponse({ error: "mcpUrl and displayName are required" }, 400);
  }

  const smithery = getSmitheryClient();
  const namespace = await getNamespace(smithery);
  const connectionId = `${user.id}-${Date.now()}`;

  console.log("[smithery-connect] Creating connection:", JSON.stringify({ namespace, connectionId, mcpUrl, displayName }));

  const conn = await smithery.beta.connect.connections.set(connectionId, {
    namespace,
    mcpUrl,
    name: displayName,
    metadata: { userId: user.id },
  });

  console.log("[smithery-connect] SDK response:", JSON.stringify(conn));

  const parsed = parseConnectionStatus(conn);
  let status = parsed.status;
  let authorizationUrl = parsed.authorizationUrl;

  if (status === "connected") {
    try {
      const verifyResult = await smithery.beta.connect.mcp.call(connectionId, {
        namespace,
        method: "tools/list",
        params: {},
      });
      console.log("[smithery-connect] Verify tools/list OK:", JSON.stringify(verifyResult).slice(0, 200));
    } catch (e: unknown) {
      console.warn("[smithery-connect] Verify tools/list failed, re-checking status:", e);
      try {
        const recheck = await smithery.beta.connect.connections.get(connectionId, { namespace });
        console.log("[smithery-connect] Re-checked connection:", JSON.stringify(recheck));
        const recheckParsed = parseConnectionStatus(recheck);
        if (recheckParsed.status === "auth_required") {
          status = "auth_required";
          authorizationUrl = recheckParsed.authorizationUrl;
        }
      } catch (e2) {
        console.warn("[smithery-connect] Re-check also failed:", e2);
      }
    }
  }

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

  const finalResponse = {
    connectionId,
    status,
    authorizationUrl,
    serverInfo: conn.serverInfo || null,
  };
  console.log("[smithery-connect] Final response:", JSON.stringify(finalResponse));
  return jsonResponse(finalResponse);
}

async function handleList(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);

  try {
    const smithery = getSmitheryClient();
    const namespace = await getNamespace(smithery);

    const listResult = await smithery.beta.connect.connections.list(namespace, {
      metadata: { userId: user.id },
    });

    const smitheryConns = listResult.data || [];

    for (const sc of smitheryConns) {
      if (sc.connectionId && sc.status) {
        const parsed = parseConnectionStatus(sc);
        await supabase
          .from("user_smithery_connections")
          .update({
            status: parsed.status,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("smithery_connection_id", sc.connectionId);
      }
    }
  } catch (e) {
    console.warn("[smithery-connect] Smithery list sync failed:", e);
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
    const smithery = getSmitheryClient();
    const namespace = await getNamespace(smithery);
    await smithery.beta.connect.connections.delete(connectionId, { namespace });
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

  const smithery = getSmitheryClient();
  const namespace = await getNamespace(smithery);

  const conn = await smithery.beta.connect.connections.get(connectionId, { namespace });
  console.log("[smithery-connect] Retry - connection status:", JSON.stringify(conn.status));

  const parsed = parseConnectionStatus(conn);

  await supabase
    .from("user_smithery_connections")
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("smithery_connection_id", connectionId);

  return jsonResponse({
    connectionId,
    status: parsed.status,
    authorizationUrl: parsed.authorizationUrl,
  });
}

async function handleListTools(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);

  const smithery = getSmitheryClient();
  const namespace = await getNamespace(smithery);

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
      const result = await smithery.beta.connect.mcp.call(conn.smithery_connection_id, {
        namespace,
        method: "tools/list",
        params: {},
      });

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
      console.error(`[smithery-connect] Error fetching tools for ${conn.display_name}:`, e);
    }
  }

  return jsonResponse({ tools: allTools, servers });
}

async function handleVerify(req: Request): Promise<Response> {
  const { user, supabase } = await authenticateUser(req);
  const { connectionId } = await req.json();

  if (!connectionId) {
    return jsonResponse({ error: "connectionId is required" }, 400);
  }

  const smithery = getSmitheryClient();
  const namespace = await getNamespace(smithery);

  const conn = await smithery.beta.connect.connections.get(connectionId, { namespace });
  const parsed = parseConnectionStatus(conn);

  await supabase
    .from("user_smithery_connections")
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("smithery_connection_id", connectionId);

  return jsonResponse({
    connectionId,
    status: parsed.status,
    authorizationUrl: parsed.authorizationUrl,
  });
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
      case "verify":
        return await handleVerify(req);
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
