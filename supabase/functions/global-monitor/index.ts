import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FMP_KEY = Deno.env.get("FMP_API_KEY") ?? "";
const FMP_BASE = "https://financialmodelingprep.com/stable";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getCached(key: string, maxAgeMs: number) {
  const { data } = await supabase
    .from("market_cache")
    .select("data, updated_at")
    .eq("cache_key", key)
    .maybeSingle();

  if (!data) return null;
  const age = Date.now() - new Date(data.updated_at).getTime();
  if (age > maxAgeMs) return null;
  return data.data;
}

async function setCache(key: string, payload: unknown) {
  await supabase.from("market_cache").upsert({
    cache_key: key,
    data: payload,
    updated_at: new Date().toISOString(),
  });
}

async function fmpFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${FMP_BASE}/${endpoint}`);
  url.searchParams.set("apikey", FMP_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const res = await fetch(url.toString(), { signal: controller.signal });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`FMP ${endpoint}: ${res.status}`);
  return res.json();
}

interface FmpQuote {
  symbol?: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  changePercentage?: number;
  change?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketCap?: number;
  open?: number;
  previousClose?: number;
  [key: string]: unknown;
}

const FALLBACK_MARKETS = [
  { symbol: "^GSPC", price: 5950.25, change: 0.4, category: "index", name: "S&P 500" },
  { symbol: "^IXIC", price: 19200.10, change: 0.6, category: "index", name: "NASDAQ" },
  { symbol: "^DJI", price: 43800.50, change: 0.2, category: "index", name: "Dow Jones" },
  { symbol: "AAPL", price: 228.50, change: 1.2, category: "stock", name: "Apple" },
  { symbol: "MSFT", price: 415.30, change: 0.8, category: "stock", name: "Microsoft" },
  { symbol: "NVDA", price: 132.40, change: -0.5, category: "stock", name: "NVIDIA" },
  { symbol: "EURUSD", price: 1.0842, change: 0.12, category: "forex", name: "EUR/USD" },
  { symbol: "GBPUSD", price: 1.2650, change: -0.08, category: "forex", name: "GBP/USD" },
  { symbol: "USDJPY", price: 154.30, change: 0.25, category: "forex", name: "USD/JPY" },
  { symbol: "BTCUSD", price: 97500, change: -2.1, category: "crypto", name: "Bitcoin" },
  { symbol: "ETHUSD", price: 2650, change: -3.4, category: "crypto", name: "Ethereum" },
  { symbol: "SOLUSD", price: 195, change: -4.2, category: "crypto", name: "Solana" },
];

const INDEX_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "Dow Jones",
};

const FOREX_NAMES: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
};

const CRYPTO_NAMES: Record<string, string> = {
  BTCUSD: "Bitcoin",
  ETHUSD: "Ethereum",
  SOLUSD: "Solana",
};

function extractPctChange(q: FmpQuote): number {
  if (typeof q.changesPercentage === "number") return q.changesPercentage;
  if (typeof q.changePercentage === "number") return q.changePercentage;
  const price = q.price ?? 0;
  const change = q.change ?? 0;
  if (price > 0 && change !== 0) {
    return (change / (price - change)) * 100;
  }
  return 0;
}

function mapQuote(
  q: FmpQuote,
  category: string,
  nameMap?: Record<string, string>
) {
  const sym = q.symbol ?? "";
  return {
    symbol: sym,
    price: q.price ?? 0,
    change: extractPctChange(q),
    category,
    name: nameMap?.[sym] ?? q.name ?? sym,
  };
}

async function fetchMarkets() {
  const cached = await getCached("markets", 30_000);
  if (cached) return cached;

  const markets: unknown[] = [];

  try {
    const indexData: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "^GSPC,^IXIC,^DJI",
    });
    for (const q of indexData) markets.push(mapQuote(q, "index", INDEX_NAMES));
  } catch { /* skip */ }

  try {
    const stockData: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "AAPL,MSFT,NVDA",
    });
    for (const q of stockData) markets.push(mapQuote(q, "stock"));
  } catch { /* skip */ }

  try {
    const forexData: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "EURUSD,GBPUSD,USDJPY",
    });
    for (const q of forexData) markets.push(mapQuote(q, "forex", FOREX_NAMES));
  } catch { /* skip */ }

  try {
    const cryptoData: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "BTCUSD,ETHUSD,SOLUSD",
    });
    for (const q of cryptoData)
      markets.push(mapQuote(q, "crypto", CRYPTO_NAMES));
  } catch { /* skip */ }

  const result = markets.length > 0 ? markets : FALLBACK_MARKETS;
  await setCache("markets", result);
  return result;
}

async function searchSymbol(query: string) {
  if (!query || query.length < 1) return [];

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = await getCached(cacheKey, 300_000);
  if (cached) return cached;

  const seen = new Set<string>();
  const results: { symbol: string; name: string; exchange: string; type: string }[] = [];

  try {
    const symbolResults = await fmpFetch("search-symbol", { query });
    for (const r of (symbolResults as { symbol?: string; name?: string; exchangeShortName?: string; type?: string }[])) {
      if (r.symbol && !seen.has(r.symbol)) {
        seen.add(r.symbol);
        results.push({
          symbol: r.symbol,
          name: r.name ?? r.symbol,
          exchange: r.exchangeShortName ?? "",
          type: r.type ?? "stock",
        });
      }
    }
  } catch { /* skip */ }

  try {
    const nameResults = await fmpFetch("search-name", { query });
    for (const r of (nameResults as { symbol?: string; name?: string; exchangeShortName?: string; type?: string }[])) {
      if (r.symbol && !seen.has(r.symbol)) {
        seen.add(r.symbol);
        results.push({
          symbol: r.symbol,
          name: r.name ?? r.symbol,
          exchange: r.exchangeShortName ?? "",
          type: r.type ?? "stock",
        });
      }
    }
  } catch { /* skip */ }

  const trimmed = results.slice(0, 8);
  await setCache(cacheKey, trimmed);
  return trimmed;
}

async function fetchQuote(symbol: string) {
  if (!symbol) return null;

  const cacheKey = `quote:${symbol.toUpperCase()}`;
  const cached = await getCached(cacheKey, 60_000);
  if (cached) return cached;

  const data: FmpQuote[] = await fmpFetch("quote", { symbol });
  const q = data?.[0];
  if (!q) return null;

  const result = {
    symbol: q.symbol ?? symbol,
    name: q.name ?? symbol,
    price: q.price ?? 0,
    change: q.change ?? 0,
    changesPercentage: q.changesPercentage ?? 0,
    dayHigh: q.dayHigh ?? 0,
    dayLow: q.dayLow ?? 0,
    volume: q.volume ?? 0,
    marketCap: q.marketCap ?? 0,
    open: q.open ?? 0,
    previousClose: q.previousClose ?? 0,
  };

  await setCache(cacheKey, result);
  return result;
}

async function fetchSports() {
  const leagues = [
    { key: "basketball/nba", tag: "NBA" },
    { key: "football/nfl", tag: "NFL" },
    { key: "hockey/nhl", tag: "NHL" },
  ];
  const results = [];
  for (const l of leagues) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${l.key}/scoreboard`
      );
      const json = await res.json();
      const events = json.events?.slice(0, 2) || [];
      for (const e of events) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        const away = comp.competitors?.find(
          (c: { homeAway: string }) => c.homeAway === "away"
        );
        const home = comp.competitors?.find(
          (c: { homeAway: string }) => c.homeAway === "home"
        );
        results.push({
          league: l.tag,
          matchup: `${away?.team?.abbreviation || "?"} vs ${home?.team?.abbreviation || "?"}`,
          status: e.status?.type?.shortDetail || "Scheduled",
          score: `${away?.score || 0}-${home?.score || 0}`,
        });
      }
    } catch {
      // skip league on error
    }
  }
  return results;
}

async function fetchNews() {
  const sources = [
    {
      url: "https://api.gdeltproject.org/api/v2/doc/doc?query=geopolitics%20OR%20military&mode=ArtList&maxrecords=8&format=json&sort=DateDesc",
      parse: (json: Record<string, unknown>) => {
        const articles =
          (json.articles as { domain: string; title: string }[]) || [];
        return articles.slice(0, 5).map((a) => ({
          source: (a.domain || "unknown").replace(/^www\./, ""),
          headline:
            a.title?.length > 80
              ? a.title.slice(0, 77) + "..."
              : a.title || "",
        }));
      },
    },
    {
      url: "https://api.gdeltproject.org/api/v2/doc/doc?query=defense%20OR%20pentagon%20OR%20nato&mode=ArtList&maxrecords=8&format=json&sort=DateDesc",
      parse: (json: Record<string, unknown>) => {
        const articles =
          (json.articles as { domain: string; title: string }[]) || [];
        return articles.slice(0, 5).map((a) => ({
          source: (a.domain || "unknown").replace(/^www\./, ""),
          headline:
            a.title?.length > 80
              ? a.title.slice(0, 77) + "..."
              : a.title || "",
        }));
      },
    },
  ];

  for (const src of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(src.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith("{") && !text.startsWith("[")) continue;
      const json = JSON.parse(text);
      const results = src.parse(json);
      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [
    { source: "gdelt", headline: "News feed temporarily unavailable" },
  ];
}

async function fetchFlights() {
  try {
    const res = await fetch(
      "https://opensky-network.org/api/states/all?lamin=25&lomin=-130&lamax=55&lomax=50"
    );
    const json = await res.json();
    const states = json.states?.slice(0, 8) || [];
    const notable = [
      "AF1",
      "AF2",
      "SAM",
      "EXEC",
      "RCH",
      "NAVY",
      "EVAC",
      "SAMU",
    ];
    const filtered = states.filter((s: string[]) => {
      const cs = (s[1] || "").trim();
      return cs && notable.some((n) => cs.startsWith(n));
    });
    const picks = filtered.length > 0 ? filtered : states.slice(0, 5);
    return picks.map((s: (string | number | null)[]) => ({
      callsign: ((s[1] as string) || "UNKN").trim(),
      origin: (s[2] as string) || "Unknown",
      altitude:
        s[7] && Number(s[7]) > 0
          ? `FL${Math.round(Number(s[7]) / 30.48)}`
          : "On Ground",
      lat: s[6] || 0,
      lon: s[5] || 0,
    }));
  } catch {
    return [];
  }
}

async function fetchPizza() {
  try {
    const res = await fetch("https://pizzint.watch/api/data");
    const json = await res.json();
    return {
      index: json.index ?? 50,
      doughcon: json.doughcon ?? 3,
      statusText: json.statusText ?? "NORMAL",
      hourlyData: json.hourlyData ?? [40, 50, 60, 45, 35],
    };
  } catch {
    return {
      index: 50,
      doughcon: 3,
      statusText: "NORMAL",
      hourlyData: [40, 50, 60, 45, 35],
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed");

    switch (feed) {
      case "sports": {
        const sports = await fetchSports();
        return jsonResponse({ sports });
      }
      case "markets": {
        const markets = await fetchMarkets();
        return jsonResponse({ markets });
      }
      case "search-symbol": {
        const query = url.searchParams.get("query") ?? "";
        const results = await searchSymbol(query);
        return jsonResponse({ results });
      }
      case "quote": {
        const symbol = url.searchParams.get("symbol") ?? "";
        const quote = await fetchQuote(symbol);
        return jsonResponse({ quote });
      }
      case "news": {
        const news = await fetchNews();
        return jsonResponse({ news });
      }
      case "flights": {
        const flights = await fetchFlights();
        return jsonResponse({ flights });
      }
      case "pizza": {
        const pizza = await fetchPizza();
        return jsonResponse({ pizza });
      }
      default:
        return jsonResponse({ error: "Unknown feed" }, 400);
    }
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
