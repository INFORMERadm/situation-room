import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FR24_TOKEN = Deno.env.get("FR24_API_TOKEN") ?? "";
const FR24_BASE = "https://fr24api.flightradar24.com/api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

async function fr24Fetch(endpoint: string, params: Record<string, string> = {}) {
  if (!FR24_TOKEN) {
    throw new Error("FR24_API_TOKEN not configured");
  }
  const url = new URL(`${FR24_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "Accept-Version": "v1",
        "Authorization": `Bearer ${FR24_TOKEN}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`FR24 ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed") ?? "";

    if (feed === "live-flights") {
      const bounds = url.searchParams.get("bounds") ?? "";
      const limit = url.searchParams.get("limit") ?? "1500";
      const variant = url.searchParams.get("variant") ?? "light";
      const params: Record<string, string> = { limit };
      if (bounds) params.bounds = bounds;

      try {
        const data = await fr24Fetch(`/live/flight-positions/${variant}`, params);
        return jsonResponse({ flights: data?.data ?? [] });
      } catch (firstErr) {
        if (variant === "full") {
          const data = await fr24Fetch("/live/flight-positions/light", params);
          return jsonResponse({ flights: data?.data ?? [] });
        }
        throw firstErr;
      }
    }

    if (feed === "flight-details") {
      const flightId = url.searchParams.get("flightId") ?? "";
      if (!flightId) return errorResponse("Missing flightId", 400);

      const data = await fr24Fetch(`/flight-summary/light`, {
        flights: flightId,
      });
      return jsonResponse({ details: data?.data?.[0] ?? null });
    }

    if (feed === "airport-info") {
      const code = url.searchParams.get("code") ?? "";
      if (!code) return errorResponse("Missing airport code", 400);

      const data = await fr24Fetch(`/static/airports/${code}/full`);
      return jsonResponse({ airport: data ?? null });
    }

    return errorResponse("Unknown feed: " + feed, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
