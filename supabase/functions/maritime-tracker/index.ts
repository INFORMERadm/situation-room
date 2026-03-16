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

interface MaritimeZone {
  id: string;
  zone_name: string;
  bbox_south: number;
  bbox_west: number;
  bbox_north: number;
  bbox_east: number;
  priority: number;
}

interface VesselCacheRow {
  vessels_data: VesselData[];
  vessel_count: number;
  last_zones_queried: string[];
  next_rotation_index: number;
  credits_used_total: number;
  fetched_at: string;
}

let memoryCache: VesselData[] = [];
let memoryCacheTime = 0;
const CACHE_TTL_MS = 120_000;

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

async function fetchZoneVessels(
  zone: MaritimeZone,
  apiKey: string
): Promise<{ vessels: VesselData[]; credits: number }> {
  const url = new URL("https://api.myshiptracking.com/api/v2/vessel/zone");
  url.searchParams.set("minlat", String(zone.bbox_south));
  url.searchParams.set("maxlat", String(zone.bbox_north));
  url.searchParams.set("minlon", String(zone.bbox_west));
  url.searchParams.set("maxlon", String(zone.bbox_east));
  url.searchParams.set("response", "simple");
  url.searchParams.set("minutesBack", "60");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (res.status === 429) {
    console.warn(`[maritime] Rate limited on zone: ${zone.zone_name}`);
    return { vessels: [], credits: 0 };
  }

  if (res.status === 402) {
    console.error("[maritime] No API credits remaining");
    throw new Error("NO_CREDITS");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[maritime] Zone ${zone.zone_name} HTTP ${res.status}: ${body}`
    );
    return { vessels: [], credits: 0 };
  }

  const rawText = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(rawText);
  } catch {
    console.error(`[maritime] Zone ${zone.zone_name}: JSON parse failed, raw response (first 500 chars): ${rawText.slice(0, 500)}`);
    return { vessels: [], credits: 0 };
  }
  const credits = parseInt(res.headers.get("X-Credit-Charged") || "0", 10);

  console.log(`[maritime] Zone ${zone.zone_name}: response keys: ${Object.keys(json).join(",")}, status field: ${json.status}, credits: ${credits}`);

  const dataArray = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : null;

  if (!dataArray) {
    console.error(
      `[maritime] Zone ${zone.zone_name}: unexpected response shape, keys: ${Object.keys(json).join(",")}, raw (first 500): ${rawText.slice(0, 500)}`
    );
    return { vessels: [], credits };
  }

  if (dataArray.length > 0) {
    console.log(`[maritime] Zone ${zone.zone_name}: ${dataArray.length} raw vessels, sample: ${JSON.stringify(dataArray[0]).slice(0, 300)}`);
  } else {
    console.log(`[maritime] Zone ${zone.zone_name}: 0 raw vessels returned by API`);
  }

  const vessels: VesselData[] = [];
  for (const v of dataArray) {
    const lat = typeof v.lat === "number" ? v.lat : parseFloat(v.lat);
    const lng = typeof v.lng === "number" ? v.lng : parseFloat(v.lng);
    const mmsi = typeof v.mmsi === "number" ? v.mmsi : parseInt(v.mmsi, 10);
    if (!mmsi || isNaN(lat) || isNaN(lng)) continue;

    const course = typeof v.course === "number" ? v.course : parseFloat(v.course) || 0;
    const speed = typeof v.speed === "number" ? v.speed : parseFloat(v.speed) || 0;
    const heading = course < 360 ? course : 0;

    vessels.push({
      mmsi,
      name: String(v.vessel_name || v.name || "").trim(),
      shipTypeCode: Number(v.vtype || v.ship_type || 0),
      shipType: getShipTypeName(Number(v.vtype || v.ship_type || 0)),
      latitude: lat,
      longitude: lng,
      courseOverGround: course < 360 ? course : 0,
      speedOverGround: speed,
      heading,
      destination: String(v.destination || "").trim(),
      timestamp: v.received ? new Date(v.received).getTime() : Date.now(),
    });
  }

  return { vessels, credits };
}

function selectZonesForCycle(
  allZones: MaritimeZone[],
  nextRotationIndex: number
): { selected: MaritimeZone[]; newRotationIndex: number } {
  const highPriority = allZones.filter((z) => z.priority === 1);
  const normalPriority = allZones.filter((z) => z.priority !== 1);

  const selected = [...highPriority];

  if (normalPriority.length > 0) {
    const idx = nextRotationIndex % normalPriority.length;
    selected.push(normalPriority[idx]);
    return { selected, newRotationIndex: idx + 1 };
  }

  return { selected, newRotationIndex: 0 };
}

async function handleVessels() {
  if (memoryCache.length > 0 && Date.now() - memoryCacheTime < CACHE_TTL_MS) {
    return jsonResponse({ vessels: memoryCache, count: memoryCache.length });
  }

  const supabase = getSupabaseClient();

  const { data: cacheRow, error: cacheError } = await supabase
    .from("vessel_cache")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!cacheError && cacheRow) {
    const cacheAge = Date.now() - new Date(cacheRow.fetched_at).getTime();
    if (cacheAge < CACHE_TTL_MS && Array.isArray(cacheRow.vessels_data) && cacheRow.vessels_data.length > 0) {
      memoryCache = cacheRow.vessels_data;
      memoryCacheTime = new Date(cacheRow.fetched_at).getTime();
      return jsonResponse({
        vessels: cacheRow.vessels_data,
        count: cacheRow.vessel_count,
      });
    }
  }

  const apiKey = Deno.env.get("MYSHIPTRACKING_API_KEY");
  if (!apiKey) {
    if (memoryCache.length > 0) {
      return jsonResponse({ vessels: memoryCache, count: memoryCache.length });
    }
    return errorResponse("MYSHIPTRACKING_API_KEY not configured", 500);
  }

  const { data: zones, error: zonesError } = await supabase
    .from("maritime_zones")
    .select("id, zone_name, bbox_south, bbox_west, bbox_north, bbox_east, priority")
    .eq("is_active", true)
    .order("priority")
    .order("zone_name");

  if (zonesError || !zones || zones.length === 0) {
    if (memoryCache.length > 0) {
      return jsonResponse({ vessels: memoryCache, count: memoryCache.length });
    }
    return errorResponse("No active maritime zones configured", 500);
  }

  const currentRotationIndex = cacheRow?.next_rotation_index ?? 0;
  const { selected, newRotationIndex } = selectZonesForCycle(
    zones as MaritimeZone[],
    currentRotationIndex
  );

  const allVessels = new Map<number, VesselData>();
  let totalCredits = 0;

  let noCredits = false;
  for (const zone of selected) {
    try {
      const { vessels, credits } = await fetchZoneVessels(zone, apiKey);
      totalCredits += credits;
      for (const v of vessels) {
        if (v.mmsi <= 0 || v.latitude === 0 || v.longitude === 0) continue;
        const existing = allVessels.get(v.mmsi);
        if (!existing || v.timestamp > existing.timestamp) {
          allVessels.set(v.mmsi, v);
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      if (err instanceof Error && err.message === "NO_CREDITS") {
        noCredits = true;
        break;
      }
      console.error(
        `[maritime] Error fetching zone ${zone.zone_name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (noCredits && allVessels.size === 0) {
    if (memoryCache.length > 0) {
      return jsonResponse({ vessels: memoryCache, count: memoryCache.length, warning: "API credits exhausted, showing cached data" });
    }
    if (cacheRow && Array.isArray(cacheRow.vessels_data) && cacheRow.vessels_data.length > 0) {
      return jsonResponse({ vessels: cacheRow.vessels_data, count: cacheRow.vessel_count, warning: "API credits exhausted, showing cached data" });
    }
    return errorResponse("MyShipTracking API credits exhausted. Please top up your account.", 402);
  }

  console.log(`[maritime] Collected ${allVessels.size} unique vessels from ${selected.length} zones`);

  if (allVessels.size === 0) {
    if (memoryCache.length > 0) {
      return jsonResponse({ vessels: memoryCache, count: memoryCache.length });
    }
    if (cacheRow && Array.isArray(cacheRow.vessels_data) && cacheRow.vessels_data.length > 0) {
      return jsonResponse({ vessels: cacheRow.vessels_data, count: cacheRow.vessel_count });
    }
    await supabase.from("vessel_cache").update({
      next_rotation_index: newRotationIndex,
      credits_used_total: (cacheRow?.credits_used_total ?? 0) + totalCredits,
    }).eq("id", 1);
    return jsonResponse({ vessels: [], count: 0 });
  }

  const vesselArray = Array.from(allVessels.values());
  const queriedZoneNames = selected.map((z) => z.zone_name);

  await supabase.from("vessel_cache").upsert({
    id: 1,
    vessels_data: vesselArray,
    vessel_count: vesselArray.length,
    last_zones_queried: queriedZoneNames,
    next_rotation_index: newRotationIndex,
    credits_used_total: (cacheRow?.credits_used_total ?? 0) + totalCredits,
    fetched_at: new Date().toISOString(),
  });

  memoryCache = vesselArray;
  memoryCacheTime = Date.now();

  return jsonResponse({ vessels: vesselArray, count: vesselArray.length });
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

async function handleStrikeEvents() {
  const supabase = getSupabaseClient();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("strike_events")
    .select("*")
    .gte("detected_at", thirtyMinAgo)
    .order("detected_at", { ascending: false })
    .limit(20);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ events: data || [] });
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
      case "vessels":
        return await handleVessels();
      case "strike-events":
        return await handleStrikeEvents();
      default:
        return errorResponse(
          "Unknown feed. Use: military-data, zones, vessels, strike-events",
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
