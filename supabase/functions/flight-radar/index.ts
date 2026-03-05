import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FR24_API_TOKEN = Deno.env.get("FR24_API_TOKEN") ?? "";
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
  const url = new URL(`${FR24_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Version": "v1",
        Authorization: `Bearer ${FR24_API_TOKEN}`,
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

interface FR24PositionLight {
  fr24_id: string;
  hex: string;
  callsign: string;
  lat: number;
  lon: number;
  track: number;
  alt: number;
  gspeed: number;
  vspeed: number;
  squawk: string;
  timestamp: number;
  source: string;
}

interface FR24PositionFull extends FR24PositionLight {
  flight: string;
  type: string;
  reg: string;
  painted_as: string;
  operating_as: string;
  orig_iata: string;
  orig_icao: string;
  dest_iata: string;
  dest_icao: string;
  eta: number;
}

function mapFR24ToFlight(p: FR24PositionLight) {
  if (p.lat === 0 && p.lon === 0) return null;

  return {
    icao24: p.hex ?? p.fr24_id,
    callsign: (p.callsign ?? "").trim(),
    origin_country: "",
    lat: p.lat,
    lon: p.lon,
    alt: p.alt ?? 0,
    gspd: p.gspeed ?? 0,
    track: p.track ?? 0,
    vspd: p.vspeed ?? 0,
    on_ground: (p.alt ?? 0) <= 0,
    squawk: p.squawk ?? "",
    geo_alt: p.alt ?? 0,
    baro_alt: p.alt ?? 0,
    last_contact: p.timestamp ?? Math.floor(Date.now() / 1000),
    category: 0,
  };
}

function mapFR24FullToDetail(p: FR24PositionFull) {
  return {
    icao24: p.hex ?? p.fr24_id,
    callsign: (p.callsign ?? "").trim(),
    origin_country: "",
    lat: p.lat,
    lon: p.lon,
    alt: p.alt ?? 0,
    gspd: p.gspeed ?? 0,
    track_heading: p.track ?? 0,
    vspd: p.vspeed ?? 0,
    on_ground: (p.alt ?? 0) <= 0,
    squawk: p.squawk ?? "",
    baro_alt: p.alt ?? 0,
    geo_alt: p.alt ?? 0,
    last_contact: p.timestamp ?? Math.floor(Date.now() / 1000),
    category: 0,
    flight: (p.flight ?? "").trim(),
    type: p.type ?? "",
    reg: p.reg ?? "",
    painted_as: p.painted_as ?? "",
    operating_as: p.operating_as ?? "",
    orig_iata: p.orig_iata ?? "",
    orig_icao: p.orig_icao ?? "",
    dest_iata: p.dest_iata ?? "",
    dest_icao: p.dest_icao ?? "",
    waypoints: null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed") ?? "";

    if (feed === "live-flights") {
      const params: Record<string, string> = { limit: "1500" };

      const bounds = url.searchParams.get("bounds");
      if (bounds) {
        const parts = bounds.split(",").map((s) => s.trim());
        if (parts.length === 4) {
          params.bounds = `${parts[0]},${parts[1]},${parts[2]},${parts[3]}`;
        }
      }

      let flights: ReturnType<typeof mapFR24ToFlight>[] = [];
      try {
        const data = await fr24Fetch("/live/flight-positions/light", params);
        const positions: FR24PositionLight[] = data?.data ?? data ?? [];
        flights = (Array.isArray(positions) ? positions : [])
          .map(mapFR24ToFlight)
          .filter((f): f is NonNullable<typeof f> => f !== null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("FR24 live flights error:", msg);
        return jsonResponse({ flights: [], error: msg, partial: true });
      }

      return jsonResponse({ flights });
    }

    if (feed === "flight-details") {
      const flightId = url.searchParams.get("flightId") ?? "";
      if (!flightId) return errorResponse("Missing flightId", 400);

      try {
        const data = await fr24Fetch("/live/flight-positions/full", {
          flights: flightId,
        });
        const positions: FR24PositionFull[] = data?.data ?? data ?? [];
        const pos = Array.isArray(positions) ? positions[0] : null;

        if (!pos) {
          return jsonResponse({ details: null });
        }

        return jsonResponse({ details: mapFR24FullToDetail(pos) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("FR24 flight details error:", msg);
        return jsonResponse({ details: null, error: msg });
      }
    }

    return errorResponse("Unknown feed: " + feed, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
