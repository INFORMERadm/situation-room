import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VesselData {
  mmsi: number;
  name: string;
  shipType: string;
  shipTypeCode: number;
  latitude: number;
  longitude: number;
  courseOverGround: number;
  speedOverGround: number;
  heading: number;
  destination: string;
  timestamp: number;
}

interface AisPositionReport {
  Latitude: number;
  Longitude: number;
  Cog: number;
  Sog: number;
  TrueHeading: number;
}

const vesselCache: Map<number, VesselData> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 25_000;
let wsConnection: WebSocket | null = null;
let wsConnecting = false;

function getShipTypeName(typeCode: number): string {
  if (typeCode >= 70 && typeCode <= 79) return "cargo";
  if (typeCode >= 80 && typeCode <= 89) return "tanker";
  if (typeCode >= 60 && typeCode <= 69) return "passenger";
  if (typeCode >= 40 && typeCode <= 49) return "high_speed";
  if (typeCode >= 30 && typeCode <= 39) return "fishing";
  if (typeCode >= 50 && typeCode <= 59) return "special";
  if (typeCode >= 20 && typeCode <= 29) return "wing_in_ground";
  return "other";
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getZoneBoundingBoxes(): Promise<number[][][] | null> {
  const supabase = getSupabaseClient();
  const { data: zones, error } = await supabase
    .from("maritime_zones")
    .select("bbox_south, bbox_west, bbox_north, bbox_east")
    .eq("is_active", true);

  if (error || !zones || zones.length === 0) return null;

  return zones.map(
    (z: {
      bbox_south: number;
      bbox_west: number;
      bbox_north: number;
      bbox_east: number;
    }) => [
      [z.bbox_south, z.bbox_west],
      [z.bbox_north, z.bbox_east],
    ]
  );
}

function processAisMessage(raw: string) {
  try {
    const msg = JSON.parse(raw);
    const mmsi = msg?.MetaData?.MMSI;
    if (!mmsi) return;

    const existing = vesselCache.get(mmsi);
    const posReport: AisPositionReport | undefined =
      msg?.Message?.PositionReport || msg?.Message?.StandardClassBPositionReport;

    if (posReport) {
      vesselCache.set(mmsi, {
        mmsi,
        name: msg.MetaData?.ShipName?.trim() || existing?.name || "",
        shipType: existing?.shipType || "other",
        shipTypeCode: existing?.shipTypeCode || 0,
        latitude: posReport.Latitude,
        longitude: posReport.Longitude,
        courseOverGround: posReport.Cog,
        speedOverGround: posReport.Sog,
        heading:
          posReport.TrueHeading === 511 ? posReport.Cog : posReport.TrueHeading,
        destination: existing?.destination || "",
        timestamp: Date.now(),
      });
    } else if (msg?.Message?.ShipStaticData && existing) {
      const sd = msg.Message.ShipStaticData;
      existing.name = sd.Name?.trim() || existing.name;
      existing.shipType = getShipTypeName(sd.Type);
      existing.shipTypeCode = sd.Type;
      existing.destination = sd.Destination?.trim() || existing.destination;
    }
  } catch { /* skip malformed */ }
}

async function ensureWsConnection(): Promise<void> {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return;
  if (wsConnecting) return;

  wsConnecting = true;
  try {
    if (wsConnection) {
      try { wsConnection.close(); } catch { /* noop */ }
      wsConnection = null;
    }

    const apiKey = Deno.env.get("AISSTREAM_API_KEY");
    if (!apiKey) throw new Error("AISSTREAM_API_KEY not configured");

    const boundingBoxes = await getZoneBoundingBoxes();
    if (!boundingBoxes) throw new Error("No active maritime zones");

    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
        try { ws.close(); } catch { /* noop */ }
      }, 10_000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(
          JSON.stringify({
            APIKey: apiKey,
            BoundingBoxes: boundingBoxes,
            FilterMessageTypes: [
              "PositionReport",
              "ShipStaticData",
              "StandardClassBPositionReport",
            ],
          })
        );
        resolve();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket connection error"));
      };
    });

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        processAisMessage(event.data);
        cacheTimestamp = Date.now();
      }
    };

    ws.onclose = () => {
      wsConnection = null;
    };

    ws.onerror = () => {
      try { ws.close(); } catch { /* noop */ }
      wsConnection = null;
    };

    wsConnection = ws;
  } finally {
    wsConnecting = false;
  }
}

function pruneStaleVessels() {
  const cutoff = Date.now() - 300_000;
  for (const [mmsi, v] of vesselCache) {
    if (v.timestamp < cutoff) vesselCache.delete(mmsi);
  }
}

async function handleVessels() {
  try {
    await ensureWsConnection();
  } catch (err) {
    if (vesselCache.size === 0) {
      return errorResponse(
        err instanceof Error ? err.message : "Failed to connect to AIS stream",
        502
      );
    }
  }

  if (vesselCache.size === 0 && wsConnection?.readyState === WebSocket.OPEN) {
    await new Promise((r) => setTimeout(r, 3000));
  }

  pruneStaleVessels();
  const vessels = Array.from(vesselCache.values());

  return jsonResponse({
    vessels,
    count: vessels.length,
    cacheAge: Date.now() - cacheTimestamp,
    wsConnected: wsConnection?.readyState === WebSocket.OPEN,
  });
}

async function handleMilitaryData() {
  const supabase = getSupabaseClient();

  const [basesResult, assetsResult] = await Promise.all([
    supabase
      .from("military_bases")
      .select("*")
      .eq("is_active", true)
      .order("operator"),
    supabase.from("military_naval_assets").select("*").order("operator"),
  ]);

  if (basesResult.error) {
    return errorResponse(basesResult.error.message, 500);
  }
  if (assetsResult.error) {
    return errorResponse(assetsResult.error.message, 500);
  }

  return jsonResponse({
    bases: basesResult.data,
    navalAssets: assetsResult.data,
  });
}

async function handleZones() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("maritime_zones")
    .select("*")
    .eq("is_active", true)
    .order("zone_name");

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ zones: data });
}

async function handleStreamConfig() {
  const apiKey = Deno.env.get("AISSTREAM_API_KEY");
  if (!apiKey) {
    return errorResponse("AISSTREAM_API_KEY not configured", 500);
  }

  const supabase = getSupabaseClient();
  const { data: zones, error: zonesError } = await supabase
    .from("maritime_zones")
    .select("bbox_south, bbox_west, bbox_north, bbox_east, zone_name")
    .eq("is_active", true);

  if (zonesError || !zones || zones.length === 0) {
    return errorResponse("No active maritime zones configured", 500);
  }

  const boundingBoxes = zones.map(
    (z: {
      bbox_south: number;
      bbox_west: number;
      bbox_north: number;
      bbox_east: number;
    }) => [
      [z.bbox_south, z.bbox_west],
      [z.bbox_north, z.bbox_east],
    ]
  );

  return jsonResponse({
    apiKey,
    boundingBoxes,
    wsUrl: "wss://stream.aisstream.io/v0/stream",
    zones: zones.map((z: { zone_name: string }) => z.zone_name),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed");

    switch (feed) {
      case "military-data":
        return await handleMilitaryData();
      case "zones":
        return await handleZones();
      case "stream-config":
        return await handleStreamConfig();
      case "vessels":
        return await handleVessels();
      default:
        return errorResponse(
          "Unknown feed. Use: military-data, zones, stream-config, vessels",
          400
        );
    }
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
