import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENSKY_USER = Deno.env.get("OPENSKY_CLIENT_ID") ?? "";
const OPENSKY_PASS = Deno.env.get("OPENSKY_CLIENT_SECRET") ?? "";
const OPENSKY_BASE = "https://opensky-network.org/api";

const basicAuth = btoa(`${OPENSKY_USER}:${OPENSKY_PASS}`);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

async function openskyFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${OPENSKY_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (OPENSKY_USER && OPENSKY_PASS) {
    headers.Authorization = `Basic ${basicAuth}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url.toString(), { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenSky ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function metersToFeet(m: number | null): number {
  if (m === null || m === undefined) return 0;
  return Math.round(m * 3.28084);
}

function msToKnots(ms: number | null): number {
  if (ms === null || ms === undefined) return 0;
  return Math.round(ms * 1.94384);
}

function msToFpm(ms: number | null): number {
  if (ms === null || ms === undefined) return 0;
  return Math.round(ms * 196.85);
}

function mapStateToFlight(s: unknown[]) {
  const lat = s[6] as number | null;
  const lon = s[5] as number | null;
  if (lat === null || lon === null) return null;

  const baroAlt = s[7] as number | null;
  const geoAlt = s[13] as number | null;
  const altMeters = baroAlt ?? geoAlt ?? 0;
  const callsign = ((s[1] as string) ?? "").trim();

  return {
    icao24: s[0] as string,
    callsign,
    origin_country: s[2] as string,
    lat,
    lon,
    alt: metersToFeet(altMeters),
    gspd: msToKnots(s[9] as number | null),
    track: (s[10] as number | null) ?? 0,
    vspd: msToFpm(s[11] as number | null),
    on_ground: s[8] as boolean,
    squawk: (s[14] as string) ?? "",
    geo_alt: metersToFeet(geoAlt),
    baro_alt: metersToFeet(baroAlt),
    last_contact: s[4] as number,
    category: (s[17] as number) ?? 0,
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
      const params: Record<string, string> = { extended: "1" };

      const bounds = url.searchParams.get("bounds");
      if (bounds) {
        const parts = bounds.split(",").map((s) => s.trim());
        if (parts.length === 4) {
          params.lamin = parts[1];
          params.lamax = parts[0];
          params.lomin = parts[2];
          params.lomax = parts[3];
        }
      }

      const data = await openskyFetch("/states/all", params);
      const states: unknown[][] = data?.states ?? [];
      const flights = states
        .map(mapStateToFlight)
        .filter((f): f is NonNullable<typeof f> => f !== null);

      return jsonResponse({ flights });
    }

    if (feed === "flight-details") {
      const icao24 = url.searchParams.get("flightId") ?? "";
      if (!icao24) return errorResponse("Missing flightId (icao24)", 400);

      const data = await openskyFetch("/states/all", {
        icao24: icao24.toLowerCase(),
        extended: "1",
      });
      const states: unknown[][] = data?.states ?? [];
      const state = states[0] ?? null;

      if (!state) {
        return jsonResponse({ details: null });
      }

      const mapped = mapStateToFlight(state);

      let track = null;
      try {
        track = await openskyFetch("/tracks", {
          icao24: icao24.toLowerCase(),
          time: "0",
        });
      } catch {
        // track endpoint can fail, not critical
      }

      const detail = {
        icao24: state[0],
        callsign: ((state[1] as string) ?? "").trim(),
        origin_country: state[2],
        lat: state[6],
        lon: state[5],
        alt: mapped?.alt ?? 0,
        gspd: mapped?.gspd ?? 0,
        track_heading: mapped?.track ?? 0,
        vspd: mapped?.vspd ?? 0,
        on_ground: state[8],
        squawk: (state[14] as string) ?? "",
        baro_alt: mapped?.baro_alt ?? 0,
        geo_alt: mapped?.geo_alt ?? 0,
        last_contact: state[4],
        category: (state[17] as number) ?? 0,
        waypoints: track?.path ?? null,
      };

      return jsonResponse({ details: detail });
    }

    return errorResponse("Unknown feed: " + feed, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
