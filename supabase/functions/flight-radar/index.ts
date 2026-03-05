import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENSKY_CLIENT_ID = Deno.env.get("OPENSKY_CLIENT_ID") ?? "";
const OPENSKY_CLIENT_SECRET = Deno.env.get("OPENSKY_CLIENT_SECRET") ?? "";
const OPENSKY_BASE = "https://opensky-network.org/api";
const OPENSKY_TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const res = await fetch(OPENSKY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenSky token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ?? 1800) * 1000;
  return cachedToken!;
}

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
  const token = await getAccessToken();
  const url = new URL(`${OPENSKY_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
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

interface StateVector {
  0: string;       // icao24
  1: string | null; // callsign
  2: string;       // origin_country
  3: number | null; // time_position
  4: number;       // last_contact
  5: number | null; // longitude
  6: number | null; // latitude
  7: number | null; // baro_altitude (meters)
  8: boolean;      // on_ground
  9: number | null; // velocity (m/s)
  10: number | null; // true_track (degrees)
  11: number | null; // vertical_rate (m/s)
  12: number[] | null; // sensors
  13: number | null; // geo_altitude (meters)
  14: string | null; // squawk
  15: boolean;      // spi
  16: number;       // position_source
  17?: number;      // category (extended only)
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

function mapStateToFlight(s: StateVector) {
  const lat = s[6];
  const lon = s[5];
  if (lat === null || lon === null) return null;

  const altMeters = s[7] ?? s[13] ?? 0;
  const callsign = (s[1] ?? "").trim();

  return {
    icao24: s[0],
    callsign,
    origin_country: s[2],
    lat,
    lon,
    alt: metersToFeet(altMeters),
    gspd: msToKnots(s[9]),
    track: s[10] ?? 0,
    vspd: msToFpm(s[11]),
    on_ground: s[8],
    squawk: s[14] ?? "",
    geo_alt: metersToFeet(s[13]),
    baro_alt: metersToFeet(s[7]),
    last_contact: s[4],
    category: s[17] ?? 0,
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
      const states: StateVector[] = data?.states ?? [];
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
      const states: StateVector[] = data?.states ?? [];
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
        callsign: (state[1] ?? "").trim(),
        origin_country: state[2],
        lat: state[6],
        lon: state[5],
        alt: mapped?.alt ?? 0,
        gspd: mapped?.gspd ?? 0,
        track_heading: mapped?.track ?? 0,
        vspd: mapped?.vspd ?? 0,
        on_ground: state[8],
        squawk: state[14] ?? "",
        baro_alt: mapped?.baro_alt ?? 0,
        geo_alt: mapped?.geo_alt ?? 0,
        last_contact: state[4],
        category: state[17] ?? 0,
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
