import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CACHE_TTL_MS = 10 * 60 * 1000;

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

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
  timeoutMs = 25000,
): Promise<unknown> {
  const url = new URL(`${OPENSKY_API}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await getOpenSkyToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

const AIRLINES: Record<string, string> = {
  AAL: "American Airlines", UAL: "United Airlines", DAL: "Delta Air Lines",
  SWA: "Southwest Airlines", JBU: "JetBlue Airways", ASA: "Alaska Airlines",
  NKS: "Spirit Airlines", FFT: "Frontier Airlines", HAL: "Hawaiian Airlines",
  BAW: "British Airways", DLH: "Lufthansa", AFR: "Air France",
  KLM: "KLM Royal Dutch", EZY: "easyJet", RYR: "Ryanair",
  SAS: "SAS Scandinavian", FIN: "Finnair", AUA: "Austrian Airlines",
  SWR: "Swiss International", TAP: "TAP Air Portugal", IBE: "Iberia",
  VLG: "Vueling", AZA: "ITA Airways", THY: "Turkish Airlines",
  AFL: "Aeroflot", UAE: "Emirates", ETD: "Etihad Airways",
  QTR: "Qatar Airways", SIA: "Singapore Airlines", CPA: "Cathay Pacific",
  ANA: "All Nippon Airways", JAL: "Japan Airlines", KAL: "Korean Air",
  CCA: "Air China", CES: "China Eastern", CSN: "China Southern",
  EVA: "EVA Air", CAL: "China Airlines", THA: "Thai Airways",
  MAS: "Malaysia Airlines", GIA: "Garuda Indonesia", QFA: "Qantas",
  ANZ: "Air New Zealand", SAA: "South African Airways",
  ETH: "Ethiopian Airlines", MSR: "EgyptAir", RJA: "Royal Jordanian",
  MEA: "Middle East Airlines", SVA: "Saudia", GFA: "Gulf Air",
  KAC: "Kuwait Airways", RAM: "Royal Air Maroc", ACA: "Air Canada",
  WJA: "WestJet", AIC: "Air India", VIR: "Virgin Atlantic",
  EIN: "Aer Lingus", LOT: "LOT Polish", CSA: "Czech Airlines",
  TAR: "Tunisair", AMX: "Aeromexico", AVA: "Avianca",
  LAN: "LATAM Airlines", GOL: "GOL Linhas", CMP: "Copa Airlines",
  SKW: "SkyWest Airlines", RPA: "Republic Airways", ENY: "Envoy Air",
  EJA: "NetJets", LXJ: "Flexjet", TVS: "Travel Service",
  WZZ: "Wizz Air", NOZ: "Norwegian", PGT: "Pegasus Airlines",
  AEE: "Aegean Airlines", BEL: "Brussels Airlines", IBS: "Iberia Express",
  VOI: "Volotea", TOM: "TUI Airways", EWG: "Eurowings",
  CLX: "Cargolux", FDX: "FedEx Express", UPS: "UPS Airlines",
  GTI: "Atlas Air", ABW: "AirBridgeCargo",
};

const AIRPORTS: Record<string, { name: string; city: string; country: string; iata: string }> = {
  KJFK: { name: "John F. Kennedy Intl", city: "New York", country: "United States", iata: "JFK" },
  KLAX: { name: "Los Angeles Intl", city: "Los Angeles", country: "United States", iata: "LAX" },
  KORD: { name: "O'Hare Intl", city: "Chicago", country: "United States", iata: "ORD" },
  KATL: { name: "Hartsfield-Jackson", city: "Atlanta", country: "United States", iata: "ATL" },
  KDFW: { name: "Dallas/Fort Worth Intl", city: "Dallas", country: "United States", iata: "DFW" },
  KDEN: { name: "Denver Intl", city: "Denver", country: "United States", iata: "DEN" },
  KSFO: { name: "San Francisco Intl", city: "San Francisco", country: "United States", iata: "SFO" },
  KSEA: { name: "Seattle-Tacoma Intl", city: "Seattle", country: "United States", iata: "SEA" },
  KLAS: { name: "Harry Reid Intl", city: "Las Vegas", country: "United States", iata: "LAS" },
  KMCO: { name: "Orlando Intl", city: "Orlando", country: "United States", iata: "MCO" },
  KMIA: { name: "Miami Intl", city: "Miami", country: "United States", iata: "MIA" },
  KEWR: { name: "Newark Liberty Intl", city: "Newark", country: "United States", iata: "EWR" },
  KBOS: { name: "Logan Intl", city: "Boston", country: "United States", iata: "BOS" },
  KMSP: { name: "Minneapolis-St Paul Intl", city: "Minneapolis", country: "United States", iata: "MSP" },
  KDTW: { name: "Detroit Metro Wayne", city: "Detroit", country: "United States", iata: "DTW" },
  KPHL: { name: "Philadelphia Intl", city: "Philadelphia", country: "United States", iata: "PHL" },
  KIAH: { name: "George Bush Intl", city: "Houston", country: "United States", iata: "IAH" },
  KPHX: { name: "Phoenix Sky Harbor", city: "Phoenix", country: "United States", iata: "PHX" },
  KCLT: { name: "Charlotte Douglas Intl", city: "Charlotte", country: "United States", iata: "CLT" },
  KDCA: { name: "Ronald Reagan Natl", city: "Washington D.C.", country: "United States", iata: "DCA" },
  KIAD: { name: "Washington Dulles Intl", city: "Washington D.C.", country: "United States", iata: "IAD" },
  EGLL: { name: "Heathrow", city: "London", country: "United Kingdom", iata: "LHR" },
  EGKK: { name: "Gatwick", city: "London", country: "United Kingdom", iata: "LGW" },
  EGSS: { name: "Stansted", city: "London", country: "United Kingdom", iata: "STN" },
  EGCC: { name: "Manchester", city: "Manchester", country: "United Kingdom", iata: "MAN" },
  EIDW: { name: "Dublin", city: "Dublin", country: "Ireland", iata: "DUB" },
  LFPG: { name: "Charles de Gaulle", city: "Paris", country: "France", iata: "CDG" },
  LFPO: { name: "Orly", city: "Paris", country: "France", iata: "ORY" },
  EDDF: { name: "Frankfurt", city: "Frankfurt", country: "Germany", iata: "FRA" },
  EDDM: { name: "Munich", city: "Munich", country: "Germany", iata: "MUC" },
  EDDB: { name: "Berlin Brandenburg", city: "Berlin", country: "Germany", iata: "BER" },
  EHAM: { name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", iata: "AMS" },
  EBBR: { name: "Brussels", city: "Brussels", country: "Belgium", iata: "BRU" },
  LSZH: { name: "Zurich", city: "Zurich", country: "Switzerland", iata: "ZRH" },
  LSGG: { name: "Geneva", city: "Geneva", country: "Switzerland", iata: "GVA" },
  LOWW: { name: "Vienna Intl", city: "Vienna", country: "Austria", iata: "VIE" },
  LEMD: { name: "Adolfo Suarez Madrid-Barajas", city: "Madrid", country: "Spain", iata: "MAD" },
  LEBL: { name: "Barcelona El Prat", city: "Barcelona", country: "Spain", iata: "BCN" },
  LPPT: { name: "Lisbon Humberto Delgado", city: "Lisbon", country: "Portugal", iata: "LIS" },
  LIRF: { name: "Rome Fiumicino", city: "Rome", country: "Italy", iata: "FCO" },
  LIMC: { name: "Milan Malpensa", city: "Milan", country: "Italy", iata: "MXP" },
  LGAV: { name: "Athens Intl", city: "Athens", country: "Greece", iata: "ATH" },
  LTFM: { name: "Istanbul", city: "Istanbul", country: "Turkey", iata: "IST" },
  EKCH: { name: "Copenhagen", city: "Copenhagen", country: "Denmark", iata: "CPH" },
  ESSA: { name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", iata: "ARN" },
  ENGM: { name: "Oslo Gardermoen", city: "Oslo", country: "Norway", iata: "OSL" },
  EFHK: { name: "Helsinki-Vantaa", city: "Helsinki", country: "Finland", iata: "HEL" },
  EPWA: { name: "Warsaw Chopin", city: "Warsaw", country: "Poland", iata: "WAW" },
  LKPR: { name: "Vaclav Havel Prague", city: "Prague", country: "Czech Republic", iata: "PRG" },
  LHBP: { name: "Budapest Liszt Ferenc", city: "Budapest", country: "Hungary", iata: "BUD" },
  OMDB: { name: "Dubai Intl", city: "Dubai", country: "UAE", iata: "DXB" },
  OMAA: { name: "Abu Dhabi Intl", city: "Abu Dhabi", country: "UAE", iata: "AUH" },
  OTHH: { name: "Hamad Intl", city: "Doha", country: "Qatar", iata: "DOH" },
  OEJN: { name: "King Abdulaziz Intl", city: "Jeddah", country: "Saudi Arabia", iata: "JED" },
  OERK: { name: "King Khalid Intl", city: "Riyadh", country: "Saudi Arabia", iata: "RUH" },
  OKBK: { name: "Kuwait Intl", city: "Kuwait City", country: "Kuwait", iata: "KWI" },
  OLBA: { name: "Rafic Hariri Intl", city: "Beirut", country: "Lebanon", iata: "BEY" },
  OJAQ: { name: "Queen Alia Intl", city: "Amman", country: "Jordan", iata: "AMM" },
  LLBG: { name: "Ben Gurion", city: "Tel Aviv", country: "Israel", iata: "TLV" },
  HECA: { name: "Cairo Intl", city: "Cairo", country: "Egypt", iata: "CAI" },
  GMMN: { name: "Mohammed V Intl", city: "Casablanca", country: "Morocco", iata: "CMN" },
  HAAB: { name: "Addis Ababa Bole", city: "Addis Ababa", country: "Ethiopia", iata: "ADD" },
  FAOR: { name: "O.R. Tambo Intl", city: "Johannesburg", country: "South Africa", iata: "JNB" },
  HKJK: { name: "Jomo Kenyatta Intl", city: "Nairobi", country: "Kenya", iata: "NBO" },
  WSSS: { name: "Changi", city: "Singapore", country: "Singapore", iata: "SIN" },
  VTBS: { name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", iata: "BKK" },
  VHHH: { name: "Hong Kong Intl", city: "Hong Kong", country: "Hong Kong", iata: "HKG" },
  RJTT: { name: "Tokyo Haneda", city: "Tokyo", country: "Japan", iata: "HND" },
  RJAA: { name: "Narita Intl", city: "Tokyo", country: "Japan", iata: "NRT" },
  RKSI: { name: "Incheon Intl", city: "Seoul", country: "South Korea", iata: "ICN" },
  ZBAA: { name: "Beijing Capital", city: "Beijing", country: "China", iata: "PEK" },
  ZSPD: { name: "Shanghai Pudong", city: "Shanghai", country: "China", iata: "PVG" },
  RCTP: { name: "Taiwan Taoyuan Intl", city: "Taipei", country: "Taiwan", iata: "TPE" },
  RPLL: { name: "Ninoy Aquino Intl", city: "Manila", country: "Philippines", iata: "MNL" },
  WMKK: { name: "Kuala Lumpur Intl", city: "Kuala Lumpur", country: "Malaysia", iata: "KUL" },
  WIII: { name: "Soekarno-Hatta Intl", city: "Jakarta", country: "Indonesia", iata: "CGK" },
  VIDP: { name: "Indira Gandhi Intl", city: "New Delhi", country: "India", iata: "DEL" },
  VABB: { name: "Chhatrapati Shivaji Intl", city: "Mumbai", country: "India", iata: "BOM" },
  YSSY: { name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", iata: "SYD" },
  YMML: { name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", iata: "MEL" },
  NZAA: { name: "Auckland", city: "Auckland", country: "New Zealand", iata: "AKL" },
  MMMX: { name: "Mexico City Intl", city: "Mexico City", country: "Mexico", iata: "MEX" },
  SBGR: { name: "Sao Paulo Guarulhos", city: "Sao Paulo", country: "Brazil", iata: "GRU" },
  SCEL: { name: "Santiago Intl", city: "Santiago", country: "Chile", iata: "SCL" },
  SKBO: { name: "El Dorado Intl", city: "Bogota", country: "Colombia", iata: "BOG" },
  SAEZ: { name: "Ezeiza Intl", city: "Buenos Aires", country: "Argentina", iata: "EZE" },
  UUEE: { name: "Sheremetyevo", city: "Moscow", country: "Russia", iata: "SVO" },
  CYYZ: { name: "Toronto Pearson Intl", city: "Toronto", country: "Canada", iata: "YYZ" },
  CYVR: { name: "Vancouver Intl", city: "Vancouver", country: "Canada", iata: "YVR" },
  CYUL: { name: "Montreal-Trudeau Intl", city: "Montreal", country: "Canada", iata: "YUL" },
};

function lookupAirline(callsign: string): string {
  if (!callsign || callsign.length < 3) return "";
  const prefix = callsign.slice(0, 3).toUpperCase();
  return AIRLINES[prefix] ?? "";
}

function lookupAirport(icao: string) {
  if (!icao) return null;
  return AIRPORTS[icao.toUpperCase()] ?? null;
}

interface CachedDetail {
  callsign: string;
  icao24: string;
  flight: string;
  aircraft_type: string;
  registration: string;
  operating_as: string;
  painted_as: string;
  orig_iata: string;
  orig_icao: string;
  dest_iata: string;
  dest_icao: string;
  eta: string | null;
  data: Record<string, unknown>;
  cached_at: string;
}

async function getCachedDetail(callsign: string): Promise<CachedDetail | null> {
  if (!callsign || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("flight_details_cache")
      .select("*")
      .eq("callsign", callsign)
      .maybeSingle();

    if (!data) return null;

    const cachedAt = new Date(data.cached_at).getTime();
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

    return data as CachedDetail;
  } catch (err) {
    console.error("Cache read failed:", err);
    return null;
  }
}

async function setCachedDetail(detail: Omit<CachedDetail, "cached_at">): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const sb = getSupabase();
    await sb
      .from("flight_details_cache")
      .upsert({
        ...detail,
        cached_at: new Date().toISOString(),
      }, { onConflict: "callsign" });
  } catch (err) {
    console.error("Cache write failed:", err);
  }
}

interface OpenSkyRoute {
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
  firstSeen: number | null;
  lastSeen: number | null;
  callsign: string | null;
}

async function fetchOpenSkyRoute(icao24: string): Promise<OpenSkyRoute | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const begin = now - 172800;
    const data = await fetchOpenSky("/flights/aircraft", {
      icao24: icao24.toLowerCase(),
      begin: String(begin),
      end: String(now),
    }, 12000) as OpenSkyRoute[];

    if (!Array.isArray(data) || data.length === 0) return null;
    return data[data.length - 1];
  } catch (err) {
    console.error("OpenSky route lookup failed:", err);
    return null;
  }
}

function buildDetailResponse(
  icao24: string,
  callsign: string,
  cached: CachedDetail | null,
  openSkyRoute: OpenSkyRoute | null,
) {
  const origIcao = cached?.orig_icao || openSkyRoute?.estDepartureAirport || "";
  const destIcao = cached?.dest_icao || openSkyRoute?.estArrivalAirport || "";
  const origIata = cached?.orig_iata || "";
  const destIata = cached?.dest_iata || "";
  const origAirport = lookupAirport(origIcao);
  const destAirport = lookupAirport(destIcao);

  const operatingAs = cached?.operating_as || "";
  const airlineName = operatingAs
    ? (AIRLINES[operatingAs.toUpperCase()] || operatingAs)
    : lookupAirline(callsign);

  return {
    icao24,
    callsign,
    flight: cached?.flight || callsign,
    aircraft_type: cached?.aircraft_type || "",
    registration: cached?.registration || "",
    operating_as: operatingAs,
    painted_as: cached?.painted_as || "",
    airline: airlineName,
    orig_iata: origIata || origAirport?.iata || "",
    orig_icao: origIcao,
    orig_name: origAirport?.name || "",
    orig_city: origAirport?.city || "",
    orig_country: origAirport?.country || "",
    dest_iata: destIata || destAirport?.iata || "",
    dest_icao: destIcao,
    dest_name: destAirport?.name || "",
    dest_city: destAirport?.city || "",
    dest_country: destAirport?.country || "",
    eta: cached?.eta || "",
    source: cached ? "cache" : openSkyRoute ? "opensky" : "basic",
  };
}

function enrichFlightResult(f: Record<string, unknown>) {
  const depIcao = String(f.estDepartureAirport ?? "");
  const arrIcao = String(f.estArrivalAirport ?? "");
  const depAirport = lookupAirport(depIcao);
  const arrAirport = lookupAirport(arrIcao);
  return {
    icao24: f.icao24 ?? "",
    firstSeen: f.firstSeen ?? 0,
    lastSeen: f.lastSeen ?? 0,
    estDepartureAirport: f.estDepartureAirport ?? null,
    estArrivalAirport: f.estArrivalAirport ?? null,
    callsign: f.callsign ? String(f.callsign).trim() : null,
    estDepartureAirportHorizDistance: f.estDepartureAirportHorizDistance ?? 0,
    estDepartureAirportVertDistance: f.estDepartureAirportVertDistance ?? 0,
    estArrivalAirportHorizDistance: f.estArrivalAirportHorizDistance ?? 0,
    estArrivalAirportVertDistance: f.estArrivalAirportVertDistance ?? 0,
    departureAirportCandidatesCount: f.departureAirportCandidatesCount ?? 0,
    arrivalAirportCandidatesCount: f.arrivalAirportCandidatesCount ?? 0,
    departureAirportName: depAirport?.name ?? "",
    departureCity: depAirport?.city ?? "",
    departureIata: depAirport?.iata ?? "",
    arrivalAirportName: arrAirport?.name ?? "",
    arrivalCity: arrAirport?.city ?? "",
    arrivalIata: arrAirport?.iata ?? "",
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
          .filter((f): f is NonNullable<typeof f> => f !== null);

        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("OpenSky live flights error:", msg);
        return jsonResponse({ flights: [], error: msg, partial: true });
      }
    }

    if (feed === "flight-details") {
      const flightId = url.searchParams.get("flightId") ?? "";
      const callsignParam = url.searchParams.get("callsign") ?? "";
      if (!flightId) return errorResponse("Missing flightId", 400);

      const callsign = callsignParam.trim();

      try {
        const cached = callsign ? await getCachedDetail(callsign) : null;
        if (cached) {
          const detail = buildDetailResponse(flightId, callsign, cached, null);
          return jsonResponse({ details: detail });
        }

        const openSkyRoute = await fetchOpenSkyRoute(flightId);

        const effectiveCallsign = callsign || openSkyRoute?.callsign?.toString().trim() || "";

        const detail = buildDetailResponse(flightId, effectiveCallsign, null, openSkyRoute);

        if (effectiveCallsign && openSkyRoute) {
          const cacheEntry = {
            callsign: effectiveCallsign,
            icao24: flightId,
            flight: detail.flight,
            aircraft_type: detail.aircraft_type,
            registration: detail.registration,
            operating_as: detail.operating_as,
            painted_as: detail.painted_as,
            orig_iata: detail.orig_iata,
            orig_icao: detail.orig_icao,
            dest_iata: detail.dest_iata,
            dest_icao: detail.dest_icao,
            eta: detail.eta || null,
            data: {},
          };
          EdgeRuntime.waitUntil(setCachedDetail(cacheEntry));
        }

        return jsonResponse({ details: detail });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Flight details error:", msg);
        return jsonResponse({ details: null, error: msg });
      }
    }

    if (feed === "flights-in-interval") {
      const begin = url.searchParams.get("begin") ?? "";
      const end = url.searchParams.get("end") ?? "";
      if (!begin || !end) return errorResponse("Missing begin or end", 400);
      const b = Number(begin);
      const e = Number(end);
      if (isNaN(b) || isNaN(e)) return errorResponse("begin and end must be numbers", 400);
      if (e - b > 7200) return errorResponse("Time interval must not exceed 2 hours", 400);
      if (e <= b) return errorResponse("end must be after begin", 400);

      try {
        const data = await fetchOpenSky("/flights/all", { begin, end }) as unknown[];
        const flights = Array.isArray(data) ? data.map((f: Record<string, unknown>) => enrichFlightResult(f)) : [];
        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404")) return jsonResponse({ flights: [] });
        return errorResponse(msg);
      }
    }

    if (feed === "flights-by-aircraft") {
      const icao24 = url.searchParams.get("icao24") ?? "";
      const begin = url.searchParams.get("begin") ?? "";
      const end = url.searchParams.get("end") ?? "";
      if (!icao24 || !begin || !end) return errorResponse("Missing icao24, begin, or end", 400);
      const b = Number(begin);
      const e = Number(end);
      if (isNaN(b) || isNaN(e)) return errorResponse("begin and end must be numbers", 400);
      if (e - b > 172800) return errorResponse("Time interval must not exceed 2 days", 400);
      if (e <= b) return errorResponse("end must be after begin", 400);

      try {
        const data = await fetchOpenSky("/flights/aircraft", {
          icao24: icao24.toLowerCase(),
          begin,
          end,
        }) as unknown[];
        const flights = Array.isArray(data) ? data.map((f: Record<string, unknown>) => enrichFlightResult(f)) : [];
        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404")) return jsonResponse({ flights: [] });
        return errorResponse(msg);
      }
    }

    if (feed === "arrivals-by-airport") {
      const airport = url.searchParams.get("airport") ?? "";
      const begin = url.searchParams.get("begin") ?? "";
      const end = url.searchParams.get("end") ?? "";
      if (!airport || !begin || !end) return errorResponse("Missing airport, begin, or end", 400);
      const b = Number(begin);
      const e = Number(end);
      if (isNaN(b) || isNaN(e)) return errorResponse("begin and end must be numbers", 400);
      if (e - b > 604800) return errorResponse("Time interval must not exceed 7 days", 400);
      if (e <= b) return errorResponse("end must be after begin", 400);

      try {
        const data = await fetchOpenSky("/flights/arrival", {
          airport: airport.toUpperCase(),
          begin,
          end,
        }) as unknown[];
        const flights = Array.isArray(data) ? data.map((f: Record<string, unknown>) => enrichFlightResult(f)) : [];
        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404")) return jsonResponse({ flights: [] });
        return errorResponse(msg);
      }
    }

    if (feed === "departures-by-airport") {
      const airport = url.searchParams.get("airport") ?? "";
      const begin = url.searchParams.get("begin") ?? "";
      const end = url.searchParams.get("end") ?? "";
      if (!airport || !begin || !end) return errorResponse("Missing airport, begin, or end", 400);
      const b = Number(begin);
      const e = Number(end);
      if (isNaN(b) || isNaN(e)) return errorResponse("begin and end must be numbers", 400);
      if (e - b > 604800) return errorResponse("Time interval must not exceed 7 days", 400);
      if (e <= b) return errorResponse("end must be after begin", 400);

      try {
        const data = await fetchOpenSky("/flights/departure", {
          airport: airport.toUpperCase(),
          begin,
          end,
        }) as unknown[];
        const flights = Array.isArray(data) ? data.map((f: Record<string, unknown>) => enrichFlightResult(f)) : [];
        return jsonResponse({ flights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404")) return jsonResponse({ flights: [] });
        return errorResponse(msg);
      }
    }

    if (feed === "track-by-aircraft") {
      const icao24 = url.searchParams.get("icao24") ?? "";
      if (!icao24) return errorResponse("Missing icao24", 400);
      const time = url.searchParams.get("time") ?? "";

      const params: Record<string, string> = { icao24: icao24.toLowerCase() };
      if (time) params.time = time;

      try {
        const data = await fetchOpenSky("/tracks/all", params) as Record<string, unknown>;
        if (!data || !data.path) return jsonResponse({ track: null });
        return jsonResponse({
          track: {
            icao24: data.icao24 ?? icao24,
            startTime: data.startTime ?? 0,
            endTime: data.endTime ?? 0,
            callsign: data.callsign ?? null,
            path: data.path ?? [],
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("404")) return jsonResponse({ track: null });
        return errorResponse(msg);
      }
    }

    return errorResponse("Unknown feed: " + feed, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
