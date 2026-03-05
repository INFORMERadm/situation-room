import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENSKY_CLIENT_ID = Deno.env.get("OPENSKY_CLIENT_ID") ?? "";
const OPENSKY_CLIENT_SECRET = Deno.env.get("OPENSKY_CLIENT_SECRET") ?? "";
const OPENSKY_TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const OPENSKY_API = "https://opensky-network.org/api";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

async function getOpenSkyToken(): Promise<string | null> {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return null;

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    });

    const res = await fetch(OPENSKY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("OpenSky token error:", res.status, text);
      cachedToken = null;
      return null;
    }

    const json = await res.json();
    cachedToken = json.access_token ?? null;
    const expiresIn = json.expires_in ?? 1800;
    tokenExpiresAt = now + expiresIn * 1000;
    return cachedToken;
  } catch (err) {
    console.error("OpenSky token fetch failed:", err);
    cachedToken = null;
    return null;
  }
}

async function fetchOpenSky(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<unknown> {
  const url = new URL(`${OPENSKY_API}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = await getOpenSkyToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url.toString(), {
      headers,
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

type StateVector = (string | number | boolean | null)[];

function mapStateToFlight(sv: StateVector) {
  const lat = sv[6] as number | null;
  const lon = sv[5] as number | null;
  if (lat == null || lon == null) return null;
  if (lat === 0 && lon === 0) return null;

  return {
    icao24: String(sv[0] ?? ""),
    callsign: String(sv[1] ?? "").trim(),
    origin_country: String(sv[2] ?? ""),
    lat,
    lon,
    alt: (sv[13] as number) ?? (sv[7] as number) ?? 0,
    gspd: (sv[9] as number) ?? 0,
    track: (sv[10] as number) ?? 0,
    vspd: (sv[11] as number) ?? 0,
    on_ground: (sv[8] as boolean) ?? false,
    squawk: String(sv[14] ?? ""),
    geo_alt: (sv[13] as number) ?? 0,
    baro_alt: (sv[7] as number) ?? 0,
    last_contact: (sv[4] as number) ?? Math.floor(Date.now() / 1000),
    category: (sv[17] as number) ?? 0,
  };
}

function mapStateToDetail(sv: StateVector) {
  const base = mapStateToFlight(sv);
  if (!base) return null;

  return {
    ...base,
    track_heading: base.track,
    flight: "",
    type: "",
    reg: "",
    painted_as: "",
    operating_as: "",
    orig_iata: "",
    orig_icao: "",
    dest_iata: "",
    dest_icao: "",
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
      const params: Record<string, string> = {};

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

      try {
        const data = (await fetchOpenSky("/states/all", params)) as {
          states: StateVector[] | null;
        };
        const states = data?.states ?? [];
        const flights = states
          .map(mapStateToFlight)
          .filter(
            (f): f is NonNullable<typeof f> => f !== null,
          );

        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("OpenSky live flights error:", msg);
        return jsonResponse({ flights: [], error: msg, partial: true });
      }
    }

    if (feed === "flight-details") {
      const flightId = url.searchParams.get("flightId") ?? "";
      if (!flightId) return errorResponse("Missing flightId", 400);

      try {
        const data = (await fetchOpenSky("/states/all", {
          icao24: flightId.toLowerCase(),
        })) as { states: StateVector[] | null };

        const states = data?.states ?? [];
        if (states.length === 0) {
          return jsonResponse({ details: null });
        }

        const detail = mapStateToDetail(states[0]);
        return jsonResponse({ details: detail });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("OpenSky flight details error:", msg);
        return jsonResponse({ details: null, error: msg });
      }
    }

    return errorResponse("Unknown feed: " + feed, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
