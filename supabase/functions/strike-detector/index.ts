import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface StrikeClassification {
  is_strike: boolean;
  headline?: string;
  event_type: string;
  source_country: string;
  source_location: string;
  target_location: string;
  projectile_count: number;
  weapon_name: string;
  confidence: number;
}

interface LocationCoords {
  lat: number;
  lng: number;
}

const LOCATIONS: Record<string, LocationCoords> = {
  "tel aviv": { lat: 32.0853, lng: 34.7818 },
  "haifa": { lat: 32.794, lng: 34.9896 },
  "jerusalem": { lat: 31.7683, lng: 35.2137 },
  "beer sheva": { lat: 31.2518, lng: 34.7913 },
  "eilat": { lat: 29.5577, lng: 34.9519 },
  "ashkelon": { lat: 31.6688, lng: 34.5743 },
  "ashdod": { lat: 31.8014, lng: 34.6435 },
  "sderot": { lat: 31.525, lng: 34.5964 },
  "netanya": { lat: 32.3215, lng: 34.8532 },
  "rishon lezion": { lat: 31.973, lng: 34.7925 },
  "herzliya": { lat: 32.1629, lng: 34.8447 },
  "dimona": { lat: 31.07, lng: 35.0284 },
  "iran": { lat: 32.4279, lng: 53.688 },
  "tehran": { lat: 35.6892, lng: 51.389 },
  "isfahan": { lat: 32.6546, lng: 51.668 },
  "tabriz": { lat: 38.08, lng: 46.2919 },
  "shiraz": { lat: 29.5918, lng: 52.5837 },
  "bushehr": { lat: 28.9684, lng: 50.8385 },
  "bandar abbas": { lat: 27.1832, lng: 56.2666 },
  "kyiv": { lat: 50.4501, lng: 30.5234 },
  "kharkiv": { lat: 49.9935, lng: 36.2304 },
  "odesa": { lat: 46.4825, lng: 30.7233 },
  "lviv": { lat: 49.8397, lng: 24.0297 },
  "dnipro": { lat: 48.4647, lng: 35.0462 },
  "zaporizhzhia": { lat: 47.8388, lng: 35.1396 },
  "mykolaiv": { lat: 46.975, lng: 31.9946 },
  "sumy": { lat: 50.9077, lng: 34.7981 },
  "poltava": { lat: 49.5883, lng: 34.5514 },
  "moscow": { lat: 55.7558, lng: 37.6173 },
  "crimea": { lat: 44.9521, lng: 34.1024 },
  "sevastopol": { lat: 44.6167, lng: 33.5254 },
  "rostov": { lat: 47.2357, lng: 39.7015 },
  "belgorod": { lat: 50.5997, lng: 36.5882 },
  "kursk": { lat: 51.7373, lng: 36.1874 },
  "voronezh": { lat: 51.672, lng: 39.1843 },
  "gaza": { lat: 31.3547, lng: 34.3088 },
  "rafah": { lat: 31.297, lng: 34.2454 },
  "khan younis": { lat: 31.3446, lng: 34.3028 },
  "beirut": { lat: 33.8938, lng: 35.5018 },
  "damascus": { lat: 33.5138, lng: 36.2765 },
  "sanaa": { lat: 15.3694, lng: 44.191 },
  "hodeidah": { lat: 14.7979, lng: 42.9534 },
  "yemen": { lat: 15.5527, lng: 48.5164 },
  "aden": { lat: 12.8275, lng: 45.0187 },
  "riyadh": { lat: 24.7136, lng: 46.6753 },
  "jeddah": { lat: 21.5433, lng: 39.1728 },
  "iraq": { lat: 33.3152, lng: 44.3661 },
  "baghdad": { lat: 33.3152, lng: 44.3661 },
  "erbil": { lat: 36.1912, lng: 44.0094 },
  "israel": { lat: 31.7683, lng: 35.2137 },
  "lebanon": { lat: 33.8547, lng: 35.8623 },
  "syria": { lat: 34.8021, lng: 38.9968 },
  "ukraine": { lat: 48.3794, lng: 31.1656 },
  "russia": { lat: 55.7558, lng: 37.6173 },
  "houthis": { lat: 15.3694, lng: 44.191 },
  "red sea": { lat: 20.0, lng: 38.0 },
  "golan heights": { lat: 33.0, lng: 35.8 },
  "west bank": { lat: 31.9474, lng: 35.2272 },
  "natanz": { lat: 33.7211, lng: 51.7277 },
  "parchin": { lat: 35.52, lng: 51.77 },
  "south lebanon": { lat: 33.3, lng: 35.4 },
  "tyre": { lat: 33.2705, lng: 35.1968 },
  "nabatieh": { lat: 33.3781, lng: 35.4841 },
};

interface WeaponProfile {
  speed_kmh: number;
  arc_height: number;
  color: string;
}

const WEAPON_PROFILES: Record<string, WeaponProfile> = {
  ballistic_missile: { speed_kmh: 7000, arc_height: 0.4, color: "#ff3d00" },
  cruise_missile: { speed_kmh: 900, arc_height: 0.05, color: "#ff9100" },
  rocket: { speed_kmh: 1800, arc_height: 0.15, color: "#ff6d00" },
  drone: { speed_kmh: 185, arc_height: 0.02, color: "#d50000" },
  air_strike: { speed_kmh: 2200, arc_height: 0.08, color: "#ffab00" },
  artillery: { speed_kmh: 2500, arc_height: 0.2, color: "#ff3d00" },
};

function resolveLocation(name: string): LocationCoords | null {
  const lower = name.toLowerCase().trim();
  if (LOCATIONS[lower]) return LOCATIONS[lower];

  for (const [key, coords] of Object.entries(LOCATIONS)) {
    if (lower.includes(key) || key.includes(lower)) return coords;
  }
  return null;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateFlightTimeSeconds(
  eventType: string,
  distKm: number
): number {
  const profile = WEAPON_PROFILES[eventType] || WEAPON_PROFILES["rocket"];
  return Math.max(10, Math.round((distKm / profile.speed_kmh) * 3600));
}

const CLASSIFICATION_PROMPT = `You are a strict military conflict event classifier. Your job is to determine if news headlines describe CONFIRMED, CURRENTLY HAPPENING military strikes.

CRITICAL RULES - you MUST follow these exactly:
1. ONLY classify headlines that explicitly report a strike/attack/bombardment AS HAPPENING RIGHT NOW
2. The headline MUST contain action verbs like "strikes", "hits", "fires", "launches", "bombs", "shells", "attacked", "bombarded"
3. The headline MUST name BOTH a source (who is attacking) AND a target (what/where is being attacked)
4. You MUST return {"is_strike": false} for ALL of the following:
   - Trade negotiations, economic news, sanctions, diplomatic talks
   - Military PREPARATIONS, mobilizations, deployments, or reservist call-ups
   - Defense system activations WITHOUT confirmed incoming fire
   - Political statements, threats, warnings, or ultimatums
   - Historical references to past attacks
   - Troop movements or military exercises
   - Intelligence reports about military CAPABILITY
   - Interceptions or defensive actions (Iron Dome, air defense)
   - Ceasefire discussions or peace negotiations
   - Surveillance activity (planes near borders, ships in waters)
   - ANY headline where you are not at least 90% certain an active strike is being described

For each CONFIRMED active strike, return:
{
  "is_strike": true,
  "headline": "<the EXACT original headline text you are classifying>",
  "event_type": "ballistic_missile" | "cruise_missile" | "rocket" | "drone" | "air_strike" | "artillery",
  "source_country": "Country launching the attack",
  "source_location": "Specific launch site or country if unknown",
  "target_location": "City or region being targeted",
  "projectile_count": <number from headline, or 1 if not stated>,
  "weapon_name": "Specific weapon system if mentioned, or empty string",
  "confidence": <0.85-1.0>
}

IMPORTANT: The "headline" field MUST be the exact original headline text. This is critical for traceability.

If a headline does NOT describe a confirmed active strike: {"is_strike": false}

Return ONLY a valid JSON array with one result per headline. No markdown, no explanation.`;

interface ClassifiedStrike {
  classification: StrikeClassification;
  matchedHeadline: string;
}

const REGION_KEYWORDS: Record<string, string[]> = {
  ukraine: ["ukrain", "kyiv", "kiev", "kharkiv", "odesa", "odessa", "lviv", "dnipro", "zaporizhzhia", "mykolaiv", "sumy", "poltava", "donbas", "donetsk", "luhansk", "crimea", "kherson"],
  russia: ["russia", "moscow", "belgorod", "kursk", "voronezh", "rostov", "sevastopol", "crimea"],
  iran: ["iran", "tehran", "isfahan", "tabriz", "shiraz", "bushehr", "bandar abbas", "natanz", "parchin", "persian"],
  israel: ["israel", "tel aviv", "haifa", "jerusalem", "beer sheva", "eilat", "ashkelon", "ashdod", "sderot", "netanya", "dimona", "herzliya", "rishon"],
  palestine: ["gaza", "rafah", "khan younis", "west bank", "palestinian"],
  lebanon: ["lebanon", "beirut", "hezbollah", "tyre", "nabatieh", "south lebanon"],
  syria: ["syria", "damascus", "aleppo", "golan"],
  yemen: ["yemen", "sanaa", "hodeidah", "aden", "houthi"],
  iraq: ["iraq", "baghdad", "erbil"],
  saudi: ["saudi", "riyadh", "jeddah"],
  australia: ["australia", "australian", "darwin", "sydney", "melbourne", "canberra"],
};

function extractRegions(text: string): Set<string> {
  const lower = text.toLowerCase();
  const regions = new Set<string>();
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        regions.add(region);
        break;
      }
    }
  }
  return regions;
}

function isHeadlineRelevant(headline: string, strike: StrikeClassification): boolean {
  if (!headline) return false;

  const headlineRegions = extractRegions(headline);
  if (headlineRegions.size === 0) return true;

  const strikeText = `${strike.source_country} ${strike.source_location} ${strike.target_location}`;
  const strikeRegions = extractRegions(strikeText);
  if (strikeRegions.size === 0) return true;

  for (const r of strikeRegions) {
    if (headlineRegions.has(r)) return true;
  }

  return false;
}

function findBestHeadline(
  strike: StrikeClassification,
  allHeadlines: string[]
): string {
  if (strike.headline) {
    const returnedHL = strike.headline.trim();
    for (const h of allHeadlines) {
      if (h === returnedHL) return h;
    }
    for (const h of allHeadlines) {
      if (
        h.toLowerCase().includes(returnedHL.toLowerCase().slice(0, 40)) ||
        returnedHL.toLowerCase().includes(h.toLowerCase().slice(0, 40))
      ) {
        if (isHeadlineRelevant(h, strike)) return h;
      }
    }
  }

  const strikeText =
    `${strike.source_country} ${strike.source_location} ${strike.target_location} ${strike.event_type}`.toLowerCase();
  const strikeWords = strikeText
    .split(/\s+/)
    .filter((w) => w.length > 3);

  let bestScore = 0;
  let bestHL = "";

  for (const h of allHeadlines) {
    if (!isHeadlineRelevant(h, strike)) continue;
    const lower = h.toLowerCase();
    let score = 0;
    for (const word of strikeWords) {
      if (lower.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestHL = h;
    }
  }

  return bestHL;
}

async function classifyHeadlines(
  headlines: string[]
): Promise<ClassifiedStrike[]> {
  if (!OPENAI_API_KEY || headlines.length === 0) return [];

  const headlineText = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: headlineText },
      ],
      temperature: 0.0,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  try {
    let cleaned = content;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    const arr: StrikeClassification[] = Array.isArray(parsed)
      ? parsed
      : [parsed];

    const results: ClassifiedStrike[] = [];
    for (const item of arr) {
      if (!item.is_strike || item.confidence < 0.85) continue;

      const matchedHeadline = findBestHeadline(item, headlines);

      if (matchedHeadline && !isHeadlineRelevant(matchedHeadline, item)) {
        continue;
      }

      results.push({ classification: item, matchedHeadline });
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchGdeltHeadlines(): Promise<string[]> {
  const queries = [
    '"missile strike" OR "rocket attack" OR "air strike" OR "shelling" OR "bombardment"',
    '"drone attack" OR "ballistic missile" OR "cruise missile launched" OR "artillery barrage"',
  ];

  const headlines: string[] = [];

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
        query
      )}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc&timespan=30min`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith("{") && !text.startsWith("[")) continue;
      const json = JSON.parse(text);
      const articles = json.articles || [];
      for (const a of articles) {
        if (a.title) headlines.push(a.title);
      }
    } catch {
      continue;
    }
  }

  return [...new Set(headlines)].slice(0, 40);
}

async function fetchRssHeadlines(): Promise<string[]> {
  const feeds = [
    "https://rss.app/feeds/_wsGBiJ7aEHbD3fVL.xml",
    "https://news.google.com/rss/search?q=missile+attack+OR+air+strike+OR+shelling&hl=en&gl=US&ceid=US:en",
    "https://www.aljazeera.com/xml/rss/all.xml",
  ];

  const headlines: string[] = [];

  for (const feedUrl of feeds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(feedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while (
        (match = itemRegex.exec(xml)) !== null &&
        headlines.length < 50
      ) {
        const block = match[1];
        const title = (
          block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
          block.match(/<title>([\s\S]*?)<\/title>/)
        )?.[1]?.trim();
        if (title) headlines.push(title);
      }
    } catch {
      continue;
    }
  }

  return headlines;
}

async function checkDuplicateEvent(
  eventType: string,
  sourceCountry: string,
  targetLabel: string
): Promise<boolean> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("strike_events")
    .select("id")
    .eq("event_type", eventType)
    .eq("source_country", sourceCountry)
    .eq("target_label", targetLabel)
    .gte("detected_at", thirtyMinAgo)
    .limit(1);

  return (data && data.length > 0) || false;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const [gdeltHeadlines, rssHeadlines] = await Promise.all([
      fetchGdeltHeadlines(),
      fetchRssHeadlines(),
    ]);

    const allHeadlines = [...new Set([...gdeltHeadlines, ...rssHeadlines])];

    if (allHeadlines.length === 0) {
      return jsonResponse({ events: [], message: "No headlines to process" });
    }

    const classifiedStrikes = await classifyHeadlines(allHeadlines);

    const inserted: string[] = [];

    for (const { classification: strike, matchedHeadline } of classifiedStrikes) {
      const headline = matchedHeadline;

      const sourceCoords =
        resolveLocation(strike.source_location) ||
        resolveLocation(strike.source_country);
      const targetCoords = resolveLocation(strike.target_location);

      if (!sourceCoords || !targetCoords) continue;

      const isDup = await checkDuplicateEvent(
        strike.event_type,
        strike.source_country,
        strike.target_location
      );
      if (isDup) continue;

      const distKm = haversineDistanceKm(
        sourceCoords.lat,
        sourceCoords.lng,
        targetCoords.lat,
        targetCoords.lng
      );
      const flightTimeSec = calculateFlightTimeSeconds(
        strike.event_type,
        distKm
      );

      const expiresAt = new Date(
        Date.now() + (flightTimeSec + 600) * 1000
      ).toISOString();

      const { error } = await supabase.from("strike_events").insert({
        event_type: strike.event_type,
        source_country: strike.source_country,
        source_label: strike.source_location || strike.source_country,
        source_lat: sourceCoords.lat,
        source_lng: sourceCoords.lng,
        target_label: strike.target_location,
        target_lat: targetCoords.lat,
        target_lng: targetCoords.lng,
        projectile_count: Math.max(1, strike.projectile_count || 1),
        estimated_flight_time_seconds: flightTimeSec,
        weapon_name: strike.weapon_name || "",
        headline,
        confidence: strike.confidence,
        status: "active",
        expires_at: expiresAt,
      });

      if (!error) inserted.push(strike.target_location);
    }

    await supabase
      .from("strike_events")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString());

    return jsonResponse({
      headlines_processed: allHeadlines.length,
      strikes_detected: classifiedStrikes.length,
      events_inserted: inserted.length,
      targets: inserted,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
