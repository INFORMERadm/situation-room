import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NAMESPACE = "n4-app";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY");
  if (!smitheryApiKey) throw new Error("Smithery API key not configured");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${smitheryApiKey}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  return fetch(`https://api.smithery.ai${path}`, options);
}

async function handleCreate(req: Request): Promise<Response> {
  try {
    const { user, supabase } = await authenticateUser(req);
    const { mcpUrl, displayName } = await req.json();

    if (!mcpUrl || !displayName) {
      return jsonResponse({ error: "mcpUrl and displayName are required" }, 400);
    }

    const connectionId = `${user.id}-${Date.now()}`;

    const res = await smitheryApiCall("PUT", `/connect/${NAMESPACE}/${connectionId}`, {
      mcpUrl,
      name: displayName,
      metadata: { userId: user.id },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[smithery-connect] Smithery API error:", res.status, errText);
      return jsonResponse(
        { error: `Smithery connection failed: ${errText}` },
        502
      );
    }

    const connData = await res.json();
    const status =
      connData.status === "auth_required" ? "auth_required" : "connected";

    await supabase.from("user_smithery_connections").upsert(
      {
        user_id: user.id,
        smithery_namespace: NAMESPACE,
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
  } catch (err) {
    console.error("[smithery-connect] create error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}

async function handleList(req: Request): Promise<Response> {
  try {
    const { user, supabase } = await authenticateUser(req);

    const res = await smitheryApiCall(
      "GET",
      `/connect/${NAMESPACE}?metadata=${encodeURIComponent(JSON.stringify({ userId: user.id }))}`
    );

    let smitheryConns: Array<{
      connectionId: string;
      status: string;
      name?: string;
      mcpUrl?: string;
      serverInfo?: unknown;
    }> = [];

    if (res.ok) {
      const data = await res.json();
      smitheryConns = data.data || data || [];
    } else {
      console.warn("[smithery-connect] Smithery list failed:", res.status);
    }

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

    const { data: localConns } = await supabase
      .from("user_smithery_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return jsonResponse({ connections: localConns || [] });
  } catch (err) {
    console.error("[smithery-connect] list error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}

async function handleRemove(req: Request): Promise<Response> {
  try {
    const { user, supabase } = await authenticateUser(req);
    const { connectionId } = await req.json();

    if (!connectionId) {
      return jsonResponse({ error: "connectionId is required" }, 400);
    }

    try {
      await smitheryApiCall("DELETE", `/connect/${NAMESPACE}/${connectionId}`);
    } catch (e) {
      console.warn("[smithery-connect] Smithery delete failed (non-fatal):", e);
    }

    await supabase
      .from("user_smithery_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("smithery_connection_id", connectionId);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[smithery-connect] remove error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}

async function handleRetry(req: Request): Promise<Response> {
  try {
    const { user, supabase } = await authenticateUser(req);
    const { connectionId } = await req.json();

    if (!connectionId) {
      return jsonResponse({ error: "connectionId is required" }, 400);
    }

    const res = await smitheryApiCall(
      "GET",
      `/connect/${NAMESPACE}/${connectionId}`
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
  } catch (err) {
    console.error("[smithery-connect] retry error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}

async function handleListTools(req: Request): Promise<Response> {
  try {
    const { user, supabase } = await authenticateUser(req);
    const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY");
    if (!smitheryApiKey) {
      return jsonResponse({ error: "Smithery API key not configured" }, 500);
    }

    const { data: connections } = await supabase
      .from("user_smithery_connections")
      .select("smithery_connection_id, display_name, mcp_url")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .eq("smithery_namespace", NAMESPACE);

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
          `https://api.smithery.ai/connect/${NAMESPACE}/${conn.smithery_connection_id}/mcp`,
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
  } catch (err) {
    console.error("[smithery-connect] list-tools error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
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
