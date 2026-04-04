import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const b of arr) {
    token += chars[b % chars.length];
  }
  return token;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "n4-artifact-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "create": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const userId = await getUserId(req);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

        const body = await req.json();
        const { html_content, title, password } = body;
        if (!html_content) return jsonResponse({ error: "Missing html_content" }, 400);

        const shareToken = generateToken();
        const isPasswordProtected = !!password;
        const passwordHash = password ? await hashPassword(password) : null;

        const { error } = await supabase.from("shared_artifacts").insert({
          user_id: userId,
          share_token: shareToken,
          title: title || "Untitled Artifact",
          html_content,
          is_password_protected: isPasswordProtected,
          password_hash: passwordHash,
        });

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ share_token: shareToken });
      }

      case "get": {
        const token = url.searchParams.get("token");
        if (!token) return jsonResponse({ error: "Missing token" }, 400);

        const { data: artifact } = await supabase
          .from("shared_artifacts")
          .select("id, title, html_content, is_password_protected, password_hash, is_active, view_count, expires_at, user_id")
          .eq("share_token", token)
          .maybeSingle();

        if (!artifact || !artifact.is_active) {
          return jsonResponse({ error: "Artifact not found" }, 404);
        }

        if (artifact.expires_at && new Date(artifact.expires_at) < new Date()) {
          return jsonResponse({ error: "Artifact has expired" }, 410);
        }

        if (artifact.is_password_protected) {
          const password = url.searchParams.get("password");
          if (!password) {
            return jsonResponse({
              password_required: true,
              title: artifact.title,
            });
          }
          const inputHash = await hashPassword(password);
          if (inputHash !== artifact.password_hash) {
            return jsonResponse({ error: "Invalid password", password_required: true }, 403);
          }
        }

        await supabase
          .from("shared_artifacts")
          .update({ view_count: (artifact.view_count || 0) + 1 })
          .eq("id", artifact.id);

        return jsonResponse({
          title: artifact.title,
          html_content: artifact.html_content,
          view_count: (artifact.view_count || 0) + 1,
        });
      }

      case "my-artifacts": {
        const userId = await getUserId(req);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

        const { data: artifacts } = await supabase
          .from("shared_artifacts")
          .select("id, share_token, title, is_password_protected, is_active, view_count, created_at, expires_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        return jsonResponse({ artifacts: artifacts ?? [] });
      }

      case "toggle": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const userId = await getUserId(req);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

        const body = await req.json();
        const { artifact_id, is_active } = body;
        if (!artifact_id) return jsonResponse({ error: "Missing artifact_id" }, 400);

        const { error } = await supabase
          .from("shared_artifacts")
          .update({ is_active: !!is_active })
          .eq("id", artifact_id)
          .eq("user_id", userId);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      }

      case "delete": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const userId = await getUserId(req);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

        const body = await req.json();
        const { artifact_id } = body;
        if (!artifact_id) return jsonResponse({ error: "Missing artifact_id" }, 400);

        const { error } = await supabase
          .from("shared_artifacts")
          .delete()
          .eq("id", artifact_id)
          .eq("user_id", userId);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
