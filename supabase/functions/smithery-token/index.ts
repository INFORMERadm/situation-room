import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const smitheryApiKey = Deno.env.get("SMITHERY_API_KEY");

    if (!smitheryApiKey) {
      return new Response(
        JSON.stringify({ error: "Smithery API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const { data: connectionsData } = await supabase
      .from("user_smithery_connections")
      .select("smithery_namespace")
      .eq("user_id", userId)
      .eq("status", "connected");

    const namespaces = [
      ...new Set((connectionsData || []).map((c: { smithery_namespace: string }) => c.smithery_namespace).filter(Boolean))
    ];

    if (namespaces.length === 0) {
      return new Response(
        JSON.stringify({ token: null, message: "No active Smithery connections" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenResponse = await fetch("https://api.smithery.ai/tokens", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smitheryApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allow: {
          connections: {
            actions: ["read"],
            namespaces,
            metadata: { userId },
          },
          mcp: {
            actions: ["write"],
            namespaces,
            metadata: { userId },
          },
        },
        ttlSeconds: 3600,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return new Response(
        JSON.stringify({ error: `Smithery token creation failed: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();

    return new Response(
      JSON.stringify({ token: tokenData.token, expiresAt: tokenData.expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
