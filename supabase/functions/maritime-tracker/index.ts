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
    zones: zones.map(
      (z: { zone_name: string }) => z.zone_name
    ),
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
      default:
        return errorResponse(
          "Unknown feed. Use: military-data, zones, stream-config",
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
