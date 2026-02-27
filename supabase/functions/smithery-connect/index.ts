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
  errorMessage: string | null;
} {
  const raw = conn.status as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return { status: "connected", authorizationUrl: null, errorMessage: null };

  const state = typeof raw.state === "string" ? raw.state : "connected";
  const authUrl = typeof raw.authorizationUrl === "string" ? raw.authorizationUrl : null;
  const errorMsg = typeof raw.message === "string" ? raw.message : null;
  console.log("[smithery-connect] parseConnectionStatus:", JSON.stringify({ state, authUrl, errorMsg }));
  return { status: state, authorizationUrl: authUrl, errorMessage: errorMsg };
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
  const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();

  const { data: existing } = await supabase
    .from("user_smithery_connections")
    .select("smithery_connection_id")
    .eq("user_id", user.id)
    .eq("mcp_url", mcpUrl)
    .limit(1);

  const connectionId = existing && existing.length > 0
    ? existing[0].smithery_connection_id
    : `${user.id}-${Date.now()}`;

  console.log("[smithery-connect] Creating connection:", JSON.stringify({ namespace, connectionId, mcpUrl, displayName }));

  const createRes = await fetch(
    `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${smitheryApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mcpUrl,
        name: displayName,
        metadata: { userId: user.id },
      }),
    }
  );

  const createBody = await createRes.text();
  console.log("[smithery-connect] Smithery PUT response:", createRes.status, createBody);

  if (!createRes.ok) {
    if (createRes.status === 409) {
      try {
        await fetch(
          `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${smitheryApiKey}` },
          }
        );
      } catch { /* ignore */ }

      const newConnectionId = `${user.id}-${Date.now()}`;
      const retryRes = await fetch(
        `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(newConnectionId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${smitheryApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mcpUrl,
            name: displayName,
            metadata: { userId: user.id },
          }),
        }
      );

      if (!retryRes.ok) {
        const retryBody = await retryRes.text();
        console.error("[smithery-connect] Retry after 409 also failed:", retryRes.status, retryBody);
        return jsonResponse({ error: `Connection failed: ${retryBody}` }, 500);
      }

      const retryConn = await retryRes.json();
      const retryParsed = parseConnectionStatus(retryConn);

      await supabase.from("user_smithery_connections").upsert(
        {
          user_id: user.id,
          smithery_namespace: namespace,
          smithery_connection_id: newConnectionId,
          mcp_url: mcpUrl,
          display_name: displayName,
          status: retryParsed.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,smithery_connection_id" }
      );

      return jsonResponse({
        connectionId: newConnectionId,
        status: retryParsed.status,
        authorizationUrl: retryParsed.authorizationUrl,
        serverInfo: retryConn.serverInfo || null,
      });
    }

    return jsonResponse({ error: `Smithery API error (${createRes.status}): ${createBody}` }, 500);
  }

  const conn = JSON.parse(createBody);
  const parsed = parseConnectionStatus(conn);
  let status = parsed.status;
  let authorizationUrl = parsed.authorizationUrl;

  if (status === "error") {
    const errMsg = parsed.errorMessage || "Connection failed on the remote server";
    console.error("[smithery-connect] Smithery returned error status:", errMsg);

    await supabase.from("user_smithery_connections").upsert(
      {
        user_id: user.id,
        smithery_namespace: namespace,
        smithery_connection_id: connectionId,
        mcp_url: mcpUrl,
        display_name: displayName,
        status: "error",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,smithery_connection_id" }
    );

    return jsonResponse({
      connectionId,
      status: "error",
      error: errMsg,
      authorizationUrl: null,
      serverInfo: conn.serverInfo || null,
    });
  }

  if (status === "connected") {
    try {
      const verifyRes = await fetch(
        `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}/mcp`,
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
      console.log("[smithery-connect] Verify MCP call status:", verifyRes.status);
    } catch (e: unknown) {
      console.warn("[smithery-connect] Verify MCP failed, re-checking status:", e);
      try {
        const recheckRes = await fetch(
          `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
          {
            headers: { Authorization: `Bearer ${smitheryApiKey}` },
          }
        );
        if (recheckRes.ok) {
          const recheck = await recheckRes.json();
          console.log("[smithery-connect] Re-checked connection:", JSON.stringify(recheck));
          const recheckParsed = parseConnectionStatus(recheck);
          if (recheckParsed.status === "auth_required") {
            status = "auth_required";
            authorizationUrl = recheckParsed.authorizationUrl;
          }
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
    const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();

    const listRes = await fetch(
      `https://api.smithery.ai/connect/${namespace}?metadata.userId=${encodeURIComponent(user.id)}`,
      {
        headers: {
          Authorization: `Bearer ${smitheryApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (listRes.ok) {
      const data = await listRes.json();
      const smitheryConns: Array<Record<string, unknown>> = data.connections || data.data || [];

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
    } else {
      console.warn("[smithery-connect] Smithery list failed:", listRes.status, await listRes.text());
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
    const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();
    await fetch(
      `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${smitheryApiKey}` },
      }
    );
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
  const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();

  const getRes = await fetch(
    `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
    {
      headers: { Authorization: `Bearer ${smitheryApiKey}` },
    }
  );

  if (!getRes.ok) {
    const body = await getRes.text();
    console.error("[smithery-connect] Retry GET failed:", getRes.status, body);
    return jsonResponse({ error: `Failed to check connection status: ${body}` }, 500);
  }

  const conn = await getRes.json();
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
  const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();

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
        console.warn(`[smithery-connect] tools/list failed for ${conn.display_name}:`, res.status);
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
  const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY")!.trim();

  const getRes = await fetch(
    `https://api.smithery.ai/connect/${encodeURIComponent(namespace)}/${encodeURIComponent(connectionId)}`,
    {
      headers: { Authorization: `Bearer ${smitheryApiKey}` },
    }
  );

  if (!getRes.ok) {
    const body = await getRes.text();
    console.error("[smithery-connect] Verify GET failed:", getRes.status, body);
    return jsonResponse({ error: `Failed to verify connection: ${body}` }, 500);
  }

  const conn = await getRes.json();
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
