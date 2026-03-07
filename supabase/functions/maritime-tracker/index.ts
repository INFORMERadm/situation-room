import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

interface AisMessage {
  MessageType: string;
  MetaData?: {
    MMSI: number;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: {
      Latitude: number;
      Longitude: number;
      Cog: number;
      Sog: number;
      TrueHeading: number;
      NavigationalStatus: number;
      Timestamp: number;
    };
    ShipStaticData?: {
      Name: string;
      Type: number;
      Destination: string;
      Imo: number;
      CallSign: string;
      Dimension?: {
        A: number;
        B: number;
        C: number;
        D: number;
      };
    };
    StandardClassBPositionReport?: {
      Latitude: number;
      Longitude: number;
      Cog: number;
      Sog: number;
      TrueHeading: number;
      Timestamp: number;
    };
  };
}

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

async function handleVesselPositions(url: URL) {
  const apiKey = Deno.env.get("AISSTREAM_API_KEY");
  if (!apiKey) {
    return errorResponse("AISSTREAM_API_KEY not configured", 500);
  }

  const supabase = getSupabaseClient();
  const { data: zones, error: zonesError } = await supabase
    .from("maritime_zones")
    .select("bbox_south, bbox_west, bbox_north, bbox_east")
    .eq("is_active", true);

  if (zonesError || !zones || zones.length === 0) {
    return errorResponse("No active maritime zones configured", 500);
  }

  const boundingBoxes = zones.map((z: { bbox_south: number; bbox_west: number; bbox_north: number; bbox_east: number }) => [
    [z.bbox_south, z.bbox_west],
    [z.bbox_north, z.bbox_east],
  ]);

  const collectDuration = parseInt(url.searchParams.get("duration") || "4") * 1000;
  const maxDuration = Math.min(collectDuration, 8000);

  const vessels = new Map<
    number,
    {
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
  >();

  return new Promise<Response>((resolve) => {
    let ws: WebSocket | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (timeout) clearTimeout(timeout);
      if (ws) {
        try { ws.close(); } catch { /* ignore */ }
      }
      resolve(
        jsonResponse({
          vessels: Array.from(vessels.values()),
          count: vessels.size,
          zonesSubscribed: zones.length,
        })
      );
    };

    try {
      ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

      timeout = setTimeout(finish, maxDuration);

      ws.onopen = () => {
        ws!.send(
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
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: AisMessage = JSON.parse(
            typeof event.data === "string" ? event.data : ""
          );

          const mmsi = msg.MetaData?.MMSI;
          if (!mmsi) return;

          const existing = vessels.get(mmsi);

          if (msg.Message?.PositionReport) {
            const pr = msg.Message.PositionReport;
            vessels.set(mmsi, {
              mmsi,
              name: msg.MetaData?.ShipName?.trim() || existing?.name || "",
              shipType: existing?.shipType || "other",
              shipTypeCode: existing?.shipTypeCode || 0,
              latitude: pr.Latitude,
              longitude: pr.Longitude,
              courseOverGround: pr.Cog,
              speedOverGround: pr.Sog,
              heading: pr.TrueHeading === 511 ? pr.Cog : pr.TrueHeading,
              destination: existing?.destination || "",
              timestamp: Date.now(),
            });
          } else if (msg.Message?.StandardClassBPositionReport) {
            const pr = msg.Message.StandardClassBPositionReport;
            vessels.set(mmsi, {
              mmsi,
              name: msg.MetaData?.ShipName?.trim() || existing?.name || "",
              shipType: existing?.shipType || "other",
              shipTypeCode: existing?.shipTypeCode || 0,
              latitude: pr.Latitude,
              longitude: pr.Longitude,
              courseOverGround: pr.Cog,
              speedOverGround: pr.Sog,
              heading: pr.TrueHeading === 511 ? pr.Cog : pr.TrueHeading,
              destination: existing?.destination || "",
              timestamp: Date.now(),
            });
          } else if (msg.Message?.ShipStaticData && existing) {
            const sd = msg.Message.ShipStaticData;
            existing.name = sd.Name?.trim() || existing.name;
            existing.shipType = getShipTypeName(sd.Type);
            existing.shipTypeCode = sd.Type;
            existing.destination = sd.Destination?.trim() || existing.destination;
          }
        } catch {
          /* skip malformed messages */
        }
      };

      ws.onerror = () => {
        finish();
      };

      ws.onclose = () => {
        if (timeout) clearTimeout(timeout);
        resolve(
          jsonResponse({
            vessels: Array.from(vessels.values()),
            count: vessels.size,
            zonesSubscribed: zones.length,
          })
        );
      };
    } catch {
      finish();
    }
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
      case "vessel-positions":
        return await handleVesselPositions(url);
      default:
        return errorResponse(
          "Unknown feed. Use: military-data, zones, vessel-positions",
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
