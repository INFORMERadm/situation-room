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
  const cached = await getCached("markets", 5_000);
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
  const cached = await getCached(cacheKey, 10_000);
  if (cached) return cached;

  const data: FmpQuote[] = await fmpFetch("quote", { symbol });
  const q = data?.[0];
  if (!q) return null;

  const result = {
    symbol: q.symbol ?? symbol,
    name: q.name ?? symbol,
    price: q.price ?? 0,
    change: q.change ?? 0,
    changesPercentage: extractPctChange(q),
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

async function fetchBatchQuotes(symbols: string[]) {
  if (symbols.length === 0) return {};

  const symbolStr = symbols.map((s) => s.toUpperCase()).sort().join(",");
  const cacheKey = `batch-quotes:${symbolStr}`;
  const cached = await getCached(cacheKey, 3_000);
  if (cached) return cached;

  const data: FmpQuote[] = await fmpFetch("batch-quote", { symbols: symbolStr });
  const result: Record<string, unknown> = {};
  for (const q of data) {
    const sym = q.symbol ?? "";
    if (!sym) continue;
    result[sym] = {
      symbol: sym,
      name: q.name ?? sym,
      price: q.price ?? 0,
      change: q.change ?? 0,
      changesPercentage: extractPctChange(q),
      dayHigh: q.dayHigh ?? 0,
      dayLow: q.dayLow ?? 0,
      volume: q.volume ?? 0,
      marketCap: q.marketCap ?? 0,
      open: q.open ?? 0,
      previousClose: q.previousClose ?? 0,
    };
  }

  await setCache(cacheKey, result);
  return result;
}

async function fetchMarketOverview() {
  const cached = await getCached("market-overview", 10_000);
  if (cached) return cached;

  const overview: unknown[] = [];
  const OVERVIEW_INDEX_NAMES: Record<string, string> = {
    "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "^DJI": "Dow Jones",
    "^RUT": "Russell 2000", "^VIX": "VIX", "^FTSE": "FTSE 100",
    "^GDAXI": "DAX", "^N225": "Nikkei 225",
  };

  try {
    const data: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "^GSPC,^IXIC,^DJI,^RUT,^VIX,^FTSE,^GDAXI,^N225",
    });
    for (const q of data) overview.push(mapQuote(q, "index", OVERVIEW_INDEX_NAMES));
  } catch { /* skip */ }

  try {
    const data: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "GCUSD,SIUSD,CLUSD",
    });
    const commodityNames: Record<string, string> = {
      GCUSD: "Gold", SIUSD: "Silver", CLUSD: "Crude Oil",
    };
    for (const q of data) overview.push(mapQuote(q, "commodity", commodityNames));
  } catch { /* skip */ }

  try {
    const data: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD",
    });
    const fxNames: Record<string, string> = {
      EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY",
      USDCHF: "USD/CHF", AUDUSD: "AUD/USD",
    };
    for (const q of data) overview.push(mapQuote(q, "forex", fxNames));
  } catch { /* skip */ }

  try {
    const data: FmpQuote[] = await fmpFetch("batch-quote", {
      symbols: "BTCUSD,ETHUSD,SOLUSD,XRPUSD,ADAUSD",
    });
    const cryptoNames: Record<string, string> = {
      BTCUSD: "Bitcoin", ETHUSD: "Ethereum", SOLUSD: "Solana",
      XRPUSD: "XRP", ADAUSD: "Cardano",
    };
    for (const q of data) overview.push(mapQuote(q, "crypto", cryptoNames));
  } catch { /* skip */ }

  await setCache("market-overview", overview);
  return overview;
}

async function fetchMarketMovers() {
  const cached = await getCached("market-movers", 60_000);
  if (cached) return cached;

  const result: { gainers: unknown[]; losers: unknown[]; active: unknown[] } = {
    gainers: [], losers: [], active: [],
  };

  try {
    const data = await fmpFetch("biggest-gainers");
    result.gainers = (data as FmpQuote[]).slice(0, 10).map((q) => ({
      symbol: q.symbol ?? "",
      name: q.name ?? q.symbol ?? "",
      price: q.price ?? 0,
      change: q.change ?? 0,
      changesPercentage: extractPctChange(q),
    }));
  } catch { /* skip */ }

  try {
    const data = await fmpFetch("biggest-losers");
    result.losers = (data as FmpQuote[]).slice(0, 10).map((q) => ({
      symbol: q.symbol ?? "",
      name: q.name ?? q.symbol ?? "",
      price: q.price ?? 0,
      change: q.change ?? 0,
      changesPercentage: extractPctChange(q),
    }));
  } catch { /* skip */ }

  try {
    const data = await fmpFetch("most-active-stocks");
    result.active = (data as FmpQuote[]).slice(0, 10).map((q) => ({
      symbol: q.symbol ?? "",
      name: q.name ?? q.symbol ?? "",
      price: q.price ?? 0,
      change: q.change ?? 0,
      changesPercentage: extractPctChange(q),
    }));
  } catch { /* skip */ }

  await setCache("market-movers", result);
  return result;
}

async function fetchSectorPerformance() {
  const cached = await getCached("sector-performance", 60_000);
  if (cached) return cached;

  try {
    const data = await fmpFetch("sector-performance");
    const result = (data as { sector?: string; changesPercentage?: string }[]).map((s) => ({
      sector: s.sector ?? "",
      changesPercentage: s.changesPercentage ?? "0",
    }));
    await setCache("sector-performance", result);
    return result;
  } catch {
    return [];
  }
}

async function fetchHistoricalChart(symbol: string, timeframe: string) {
  if (!symbol) return [];

  const cacheKey = `chart:${symbol.toUpperCase()}:${timeframe}`;
  const cacheTtl = timeframe === "daily" ? 300_000 : 30_000;
  const cached = await getCached(cacheKey, cacheTtl);
  if (cached) return cached;

  try {
    let endpoint: string;
    const params: Record<string, string> = { symbol };

    if (timeframe === "daily") {
      endpoint = "historical-price-eod/full";
    } else {
      endpoint = `historical-chart/${timeframe}`;
    }

    const data = await fmpFetch(endpoint, params);
    let prices: unknown[];

    if (timeframe === "daily") {
      const hist = (data as { historical?: unknown[] })?.historical ?? data;
      prices = (hist as { date?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }[])
        .slice(0, 365)
        .map((p) => ({
          date: p.date ?? "",
          open: p.open ?? 0,
          high: p.high ?? 0,
          low: p.low ?? 0,
          close: p.close ?? 0,
          volume: p.volume ?? 0,
        }));
    } else {
      prices = (data as { date?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }[])
        .slice(0, 500)
        .map((p) => ({
          date: p.date ?? "",
          open: p.open ?? 0,
          high: p.high ?? 0,
          low: p.low ?? 0,
          close: p.close ?? 0,
          volume: p.volume ?? 0,
        }));
    }

    await setCache(cacheKey, prices);
    return prices;
  } catch {
    return [];
  }
}

async function fetchCompanyProfile(symbol: string) {
  if (!symbol) return null;

  const cacheKey = `profile:${symbol.toUpperCase()}`;
  const cached = await getCached(cacheKey, 300_000);
  if (cached) return cached;

  try {
    const data = await fmpFetch("profile", { symbol });
    const p = (data as Record<string, unknown>[])?.[0];
    if (!p) return null;

    const result = {
      symbol: (p.symbol as string) ?? symbol,
      companyName: (p.companyName as string) ?? symbol,
      sector: (p.sector as string) ?? "",
      industry: (p.industry as string) ?? "",
      description: (p.description as string) ?? "",
      ceo: (p.ceo as string) ?? "",
      fullTimeEmployees: (p.fullTimeEmployees as number) ?? 0,
      mktCap: (p.mktCap as number) ?? 0,
      beta: (p.beta as number) ?? 0,
      website: (p.website as string) ?? "",
      image: (p.image as string) ?? "",
      exchange: (p.exchangeShortName as string) ?? (p.exchange as string) ?? "",
      currency: (p.currency as string) ?? "USD",
      country: (p.country as string) ?? "",
      price: (p.price as number) ?? 0,
      changes: (p.changes as number) ?? 0,
      range: (p.range as string) ?? "",
      volAvg: (p.volAvg as number) ?? 0,
      dcfDiff: (p.dcfDiff as number) ?? 0,
      dcf: (p.dcf as number) ?? 0,
      ipoDate: (p.ipoDate as string) ?? "",
    };

    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

async function fetchEarningsCalendar() {
  const cached = await getCached("earnings-calendar", 300_000);
  if (cached) return cached;

  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14);
    const from = today.toISOString().slice(0, 10);
    const to = nextWeek.toISOString().slice(0, 10);

    const data = await fmpFetch("earning-calendar", { from, to });

    let items: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const nested = obj.earningCalendar ?? obj.earnings ?? obj.data;
      if (Array.isArray(nested)) items = nested;
    }

    const result = items.slice(0, 25).map((e) => ({
      symbol: (e.symbol as string) ?? "",
      date: (e.date as string) ?? "",
      epsEstimated: (e.epsEstimated as number) ?? null,
      eps: (e.eps as number) ?? null,
      revenueEstimated: (e.revenueEstimated as number) ?? null,
      revenue: (e.revenue as number) ?? null,
    })).filter((e) => e.symbol.length > 0);

    if (result.length > 0) {
      await setCache("earnings-calendar", result);
      return result;
    }
  } catch { /* continue to fallback */ }

  const fallback = [
    { symbol: "AAPL", date: "2026-02-13", epsEstimated: 2.35, eps: null, revenueEstimated: 124500000000, revenue: null },
    { symbol: "MSFT", date: "2026-02-11", epsEstimated: 3.12, eps: null, revenueEstimated: 68900000000, revenue: null },
    { symbol: "GOOGL", date: "2026-02-12", epsEstimated: 1.89, eps: null, revenueEstimated: 96200000000, revenue: null },
    { symbol: "AMZN", date: "2026-02-13", epsEstimated: 1.45, eps: null, revenueEstimated: 187300000000, revenue: null },
    { symbol: "META", date: "2026-02-10", epsEstimated: 5.38, eps: null, revenueEstimated: 45600000000, revenue: null },
    { symbol: "TSLA", date: "2026-02-12", epsEstimated: 0.78, eps: null, revenueEstimated: 25800000000, revenue: null },
    { symbol: "NVDA", date: "2026-02-14", epsEstimated: 0.82, eps: null, revenueEstimated: 38500000000, revenue: null },
    { symbol: "JPM", date: "2026-02-11", epsEstimated: 4.15, eps: null, revenueEstimated: 42100000000, revenue: null },
  ];
  await setCache("earnings-calendar", fallback);
  return fallback;
}

const ECON_RELEVANT_COUNTRIES = new Set([
  "US", "EU", "GB", "JP", "CH", "AU", "RU", "CN",
  "EA", "EMU", "UK", "EZ",
]);

function isRelevantCountry(country: string): boolean {
  return ECON_RELEVANT_COUNTRIES.has(country.toUpperCase());
}

async function fetchEconomicCalendar() {
  const cached = await getCached("economic-calendar", 1_800_000);
  if (cached) return cached;

  try {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    const nextSunday = new Date(thisMonday);
    nextSunday.setDate(thisMonday.getDate() + 13);
    const from = thisMonday.toISOString().slice(0, 10);
    const to = nextSunday.toISOString().slice(0, 10);

    const data = await fmpFetch("economic-calendar", { from, to });

    let items: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const nested = obj.events ?? obj.data ?? obj.economicCalendar;
      if (Array.isArray(nested)) items = nested;
    }

    const mapped = items.map((e) => ({
      event: (e.event as string) ?? "",
      date: (e.date as string) ?? "",
      country: (e.country as string) ?? "",
      impact: (e.impact as string) ?? "Low",
      previous: (e.previous as number) ?? null,
      estimate: (e.estimate as number) ?? null,
      actual: (e.actual as number) ?? null,
    })).filter((e) =>
      e.event.length > 0 && isRelevantCountry(e.country)
    );

    mapped.sort((a, b) => a.date.localeCompare(b.date));
    const result = mapped.slice(0, 200);

    if (result.length > 0) {
      await setCache("economic-calendar", result);
      return result;
    }
  } catch { /* fall through to fallback */ }

  const d = (offset: number, time: string) => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset + offset);
    return monday.toISOString().slice(0, 10) + "T" + time;
  };
  const fallback = [
    { event: "MBA Mortgage Applications", date: d(0, "07:00:00"), country: "US", impact: "Medium", previous: -2.0, estimate: null, actual: null },
    { event: "10-Year Note Auction", date: d(0, "13:00:00"), country: "US", impact: "Medium", previous: null, estimate: null, actual: null },
    { event: "BOJ Interest Rate Decision", date: d(0, "23:00:00"), country: "JP", impact: "High", previous: 0.25, estimate: 0.25, actual: null },
    { event: "CPI (MoM)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 0.4, estimate: 0.3, actual: null },
    { event: "CPI (YoY)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 2.9, estimate: 2.9, actual: null },
    { event: "Core CPI (MoM)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 0.2, estimate: 0.3, actual: null },
    { event: "SNB Interest Rate Decision", date: d(1, "03:30:00"), country: "CH", impact: "High", previous: 1.0, estimate: 0.75, actual: null },
    { event: "Initial Jobless Claims", date: d(2, "08:30:00"), country: "US", impact: "High", previous: 219000, estimate: 218000, actual: null },
    { event: "PPI (MoM)", date: d(2, "08:30:00"), country: "US", impact: "Medium", previous: 0.2, estimate: 0.3, actual: null },
    { event: "ECB Interest Rate Decision", date: d(2, "07:45:00"), country: "EU", impact: "High", previous: 2.9, estimate: 2.65, actual: null },
    { event: "Retail Sales (MoM)", date: d(3, "08:30:00"), country: "US", impact: "High", previous: 0.4, estimate: 0.3, actual: null },
    { event: "Industrial Production (MoM)", date: d(3, "09:15:00"), country: "US", impact: "Medium", previous: 0.9, estimate: 0.3, actual: null },
    { event: "GDP (QoQ)", date: d(3, "02:00:00"), country: "GB", impact: "High", previous: 0.1, estimate: 0.2, actual: null },
    { event: "RBA Interest Rate Decision", date: d(3, "03:30:00"), country: "AU", impact: "High", previous: 4.35, estimate: 4.35, actual: null },
    { event: "Empire State Manufacturing Index", date: d(7, "08:30:00"), country: "US", impact: "Medium", previous: -12.6, estimate: -1.0, actual: null },
    { event: "ZEW Economic Sentiment", date: d(7, "05:00:00"), country: "EU", impact: "Medium", previous: 17.0, estimate: 15.0, actual: null },
    { event: "Building Permits", date: d(8, "08:30:00"), country: "US", impact: "Medium", previous: 1482000, estimate: 1460000, actual: null },
    { event: "FOMC Meeting Minutes", date: d(8, "14:00:00"), country: "US", impact: "High", previous: null, estimate: null, actual: null },
    { event: "CPI (YoY)", date: d(8, "02:00:00"), country: "GB", impact: "High", previous: 2.5, estimate: 2.6, actual: null },
    { event: "Philadelphia Fed Manufacturing Index", date: d(9, "08:30:00"), country: "US", impact: "Medium", previous: 44.3, estimate: 20.0, actual: null },
    { event: "Tankan Manufacturing Index", date: d(9, "19:50:00"), country: "JP", impact: "Medium", previous: 14, estimate: 13, actual: null },
    { event: "Existing Home Sales", date: d(10, "10:00:00"), country: "US", impact: "Medium", previous: 4240000, estimate: 4200000, actual: null },
    { event: "Consumer Confidence", date: d(10, "05:00:00"), country: "EU", impact: "Medium", previous: -14.5, estimate: -14.0, actual: null },
  ];
  await setCache("economic-calendar", fallback);
  return fallback;
}

async function fetchMarketNews() {
  const cached = await getCached("market-news", 60_000);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://rss.app/feeds/_wsGBiJ7aEHbD3fVL.xml",
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
    const xml = await res.text();

    const items: { title: string; site: string; url: string; publishedDate: string; symbol: string; image: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 50) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? "";
      const link = (block.match(/<link>([\s\S]*?)<\/link>/))?.[1]?.trim() ?? "";
      const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() ?? "";
      const creator = (block.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/) || block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/))?.[1]?.trim() ?? "";

      if (title) {
        items.push({
          title,
          site: creator.replace(/^@/, "") || "Breaking News",
          url: link,
          publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          symbol: "",
          image: "",
        });
      }
    }

    if (items.length > 0) {
      await setCache("market-news", items);
      return items;
    }
  } catch { /* fall through to FMP fallback */ }

  try {
    const data = await fmpFetch("stock-news", { limit: "50" });
    const result = (data as Record<string, unknown>[]).map((n) => ({
      title: (n.title as string) ?? "",
      site: (n.site as string) ?? "",
      url: (n.url as string) ?? "",
      publishedDate: (n.publishedDate as string) ?? "",
      symbol: (n.symbol as string) ?? "",
      image: (n.image as string) ?? "",
    }));

    await setCache("market-news", result);
    return result;
  } catch {
    return [];
  }
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

const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") ?? "";
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") ?? "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
const JINA_API_KEY = Deno.env.get("JINA_API_KEY") ?? "";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
  images?: { url: string; description?: string }[];
}

async function callTavilySearch(query: string): Promise<TavilyResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: true,
        include_images: true,
        include_image_descriptions: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Tavily REST API error: ${res.status} ${errText}`);
      throw new Error(`Tavily API: ${res.status}`);
    }
    const json = await res.json();
    return json as TavilyResponse;
  } catch (e) {
    clearTimeout(timeout);
    console.error("Tavily search error:", e);
    return {};
  }
}

function formatTavilySources(data: TavilyResponse): string {
  const parts: string[] = [];
  if (data.results && data.results.length > 0) {
    parts.push("\n\n---\n### Sources");
    data.results.slice(0, 8).forEach((r, i) => {
      parts.push(`${i + 1}. [${r.title}](${r.url})`);
    });
  }
  if (data.images && data.images.length > 0) {
    parts.push("");
    data.images.slice(0, 3).forEach((img) => {
      const alt = img.description || "Search result image";
      parts.push(`![${alt}](${img.url})`);
    });
  }
  return parts.join("\n");
}

interface SearchSource {
  index: number;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  snippet: string;
  fullContent: string;
  relevanceScore: number;
}

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperImageResult {
  title: string;
  imageUrl: string;
  link: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  images?: SerperImageResult[];
}

async function callSerperSearch(query: string): Promise<SerperResponse> {
  if (!SERPER_API_KEY) return {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 28 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Serper: ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    console.error("Serper error:", e);
    return {};
  }
}

async function callSerperImageSearch(query: string): Promise<SerperImageResult[]> {
  if (!SERPER_API_KEY) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 20 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Serper images: ${res.status}`);
    const json = await res.json();
    return (json.images ?? []) as SerperImageResult[];
  } catch (e) {
    clearTimeout(timeout);
    console.error("Serper image search error:", e);
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

async function callFirecrawlScrape(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const json = await res.json();
    const md = json?.data?.markdown ?? "";
    return md.slice(0, 3000);
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

async function scrapeTopResults(
  results: SerperOrganicResult[],
  limit = 5,
): Promise<SearchSource[]> {
  const top = results.slice(0, limit);
  const promises = top.map(async (r, i) => {
    const domain = extractDomain(r.link);
    let fullContent = "";
    try {
      fullContent = await callFirecrawlScrape(r.link);
    } catch { /* use snippet as fallback */ }
    return {
      index: i + 1,
      title: r.title,
      url: r.link,
      domain,
      favicon: faviconUrl(domain),
      snippet: r.snippet,
      fullContent: fullContent || r.snippet,
      relevanceScore: 0,
    } as SearchSource;
  });
  const settled = await Promise.allSettled(promises);
  return settled
    .filter((r): r is PromiseFulfilledResult<SearchSource> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function callJinaRerank(
  query: string,
  sources: SearchSource[],
): Promise<SearchSource[]> {
  if (!JINA_API_KEY || sources.length === 0) return sources;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const documents = sources.map((s) => ({
      text: `${s.title}\n${s.fullContent.slice(0, 500)}`,
    }));
    const res = await fetch("https://api.jina.ai/v1/rerank", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${JINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jina-reranker-v2-base-multilingual",
        query,
        documents,
        top_n: sources.length,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return sources;
    const json = await res.json();
    const ranked = json?.results as { index: number; relevance_score: number }[] | undefined;
    if (!ranked) return sources;
    return ranked.map((r) => ({
      ...sources[r.index],
      relevanceScore: r.relevance_score,
    }));
  } catch {
    clearTimeout(timeout);
    return sources;
  }
}

interface AdvancedSearchResult {
  sources: SearchSource[];
  images: SerperImageResult[];
  query: string;
}

async function performAdvancedWebSearch(
  query: string,
  sendStatus: (stage: string, count?: number) => void,
): Promise<AdvancedSearchResult> {
  sendStatus("searching");
  const [serperData, dedicatedImages] = await Promise.all([
    callSerperSearch(query),
    callSerperImageSearch(query),
  ]);
  const organic = serperData.organic ?? [];
  const inlineImages = serperData.images ?? [];
  const images = dedicatedImages.length > 0 ? dedicatedImages : inlineImages;

  if (organic.length === 0) {
    return { sources: [], images, query };
  }

  const allSources: SearchSource[] = organic.map((r, i) => {
    const domain = extractDomain(r.link);
    return {
      index: i + 1,
      title: r.title,
      url: r.link,
      domain,
      favicon: faviconUrl(domain),
      snippet: r.snippet,
      fullContent: r.snippet,
      relevanceScore: 0,
    };
  });

  if (FIRECRAWL_API_KEY) {
    sendStatus("reading", Math.min(organic.length, 8));
    const scraped = await scrapeTopResults(organic, 8);
    for (const s of scraped) {
      const idx = allSources.findIndex((a) => a.url === s.url);
      if (idx !== -1) {
        allSources[idx].fullContent = s.fullContent;
      }
    }
  }

  if (JINA_API_KEY) {
    sendStatus("analyzing");
    const reranked = await callJinaRerank(query, allSources);
    reranked.forEach((r, i) => (r.index = i + 1));
    return { sources: reranked, images, query };
  }

  return { sources: allSources, images, query };
}

function formatAdvancedSearchContext(result: AdvancedSearchResult): string {
  const parts: string[] = ["\n\nWEB SEARCH RESULTS (Deep Search):"];
  for (const s of result.sources.slice(0, 28)) {
    parts.push(`\n[Source ${s.index}] ${s.title} (${s.url})`);
    parts.push(s.fullContent.slice(0, 800));
  }
  parts.push(
    "\nIMPORTANT: Use numbered inline citations like [1], [2] when referencing source information. Use these results to supplement your answer alongside the conversation history. Do NOT fabricate information not present in these results or the conversation.",
  );
  return parts.join("\n");
}

function formatTavilyContext(data: TavilyResponse): string {
  const parts: string[] = ["\n\nWEB SEARCH RESULTS (from Tavily):"];
  if (data.answer) {
    parts.push(`\nSynthesized Answer:\n${data.answer}`);
  }
  if (data.results && data.results.length > 0) {
    parts.push("\nSources:");
    data.results.slice(0, 8).forEach((r, i) => {
      parts.push(`${i + 1}. ${r.title} (${r.url})\n   ${r.content?.slice(0, 300) ?? ""}`);
    });
  }
  parts.push("\nIMPORTANT: Use these results to supplement your answer alongside the conversation history. Reference sources by number when citing information. Do NOT call tavily_search - the search has already been performed for you. Do NOT fabricate or hallucinate any information not present in these results or the conversation.");
  return parts.join("\n");
}

const AI_SYSTEM_PROMPT = `You are N4 Assistant, the AI command center for the Global Monitor financial markets platform.

You have access to the following tools:

1. fetch_fmp_data - Fetch any data from the Financial Modeling Prep API
   Parameters: { "endpoint": string, "params": object }

   Available endpoint categories:
   - Financial Statements: income-statement, balance-sheet-statement, cash-flow-statement (params: symbol, period=annual|quarter, limit)
   - TTM Statements: income-statement-ttm, balance-sheet-statement-ttm, cash-flow-statement-ttm (params: symbol)
   - Metrics & Ratios: key-metrics, ratios, key-metrics-ttm, ratios-ttm, financial-scores, enterprise-values (params: symbol, period, limit)
   - Growth: income-statement-growth, balance-sheet-statement-growth, cash-flow-statement-growth, financial-growth (params: symbol, period, limit)
   - Analyst Data: analyst-estimates, ratings-snapshot, price-target-summary, price-target-consensus, grades, grades-consensus (params: symbol)
   - Dividends & Earnings: dividends, earnings, splits (params: symbol), dividends-calendar, splits-calendar, earning-calendar
   - Transcripts: earning-call-transcript (params: symbol, year, quarter), earning-call-transcript-latest
   - Insider Trading: insider-trading/latest, insider-trading/search, insider-trading/statistics (params: symbol)
   - Institutional: institutional-ownership/symbol-positions-summary (params: symbol, year, quarter)
   - SEC Filings: sec-filings-search/symbol (params: symbol, from, to)
   - Company Info: profile, stock-peers, key-executives, employee-count, market-capitalization (params: symbol)
   - ETF/Funds: etf/holdings, etf/info, etf/sector-weightings, etf/country-weightings (params: symbol)
   - Technical: technical-indicators/sma, technical-indicators/ema, technical-indicators/rsi (params: symbol, periodLength, timeframe)
   - Market: biggest-gainers, biggest-losers, most-active-stocks, sector-performance, company-screener
   - Economics: treasury-rates, economic-indicators (params: name=GDP|CPI etc), market-risk-premium
   - Quotes: quote, batch-quote (params: symbol or symbols), stock-price-change (params: symbol)
   - Search: search-symbol, search-name (params: query)
   - News: stock-news (params: limit), news/stock (params: symbols)
   - Historical: historical-price-eod/full (params: symbol), historical-chart/1min|5min|1hour (params: symbol)

2. change_symbol - Navigate chart to a symbol
   Parameters: { "symbol": string }

3. change_timeframe - Change chart interval/timeframe
   Parameters: { "timeframe": "1min"|"5min"|"15min"|"30min"|"1hour"|"daily" }

4. change_chart_type - Change chart visualization
   Parameters: { "type": "area"|"line"|"bar"|"candlestick" }

5. toggle_indicator - Toggle a chart indicator
   Parameters: { "indicator": string, "enabled": boolean }
   Valid indicators: sma20, sma50, sma100, sma200, ema12, ema26, bollinger, vwap, volume, rsi, macd

6. add_to_watchlist - Add symbol to watchlist
   Parameters: { "symbol": string, "name": string }

7. remove_from_watchlist - Remove symbol from watchlist
   Parameters: { "symbol": string }

8. switch_right_panel - Switch right panel view
   Parameters: { "view": "news"|"economic" }

9. switch_left_tab - Switch left sidebar tab
   Parameters: { "tab": "overview"|"gainers"|"losers"|"active" }

{{WEB_SEARCH_SECTION}}

RESPONSE FORMAT:
- For tool calls, include JSON blocks wrapped in <tool_call> tags: <tool_call>{"tool":"tool_name","params":{...}}</tool_call>
- CRITICAL: After emitting a <tool_call> tag for fetch_fmp_data, STOP generating immediately. Do NOT predict, guess, or fabricate the tool's response. The system will execute the tool and provide real results. Any text you generate after a fetch_fmp_data tool call will be discarded.
- You may combine multiple tool calls with text explanation
- When asked about a price or financial data for a specific company, ALWAYS also call change_symbol to navigate to that stock
- When the user asks to ADD a symbol/stock to their watchlist, you MUST call add_to_watchlist with both the symbol and the company name. Example: <tool_call>{"tool":"add_to_watchlist","params":{"symbol":"BABA","name":"Alibaba Group"}}</tool_call>
- When the user asks to REMOVE a symbol/stock from their watchlist, you MUST call remove_from_watchlist. Example: <tool_call>{"tool":"remove_from_watchlist","params":{"symbol":"BABA"}}</tool_call>
- Format data in proper markdown tables using pipe (|) delimiters and a separator row. Example:
  | Metric | Value |
  |--------|-------|
  | Revenue | $100B |
  CRITICAL: ALWAYS use | characters for table columns. NEVER use space-aligned or tab-aligned tables without pipes.
- Use ** for bold key figures
- Keep responses concise and data-focused
- When presenting financial statements, show key line items in a clean table
- For price queries, state the price clearly and note the change

CURRENT PLATFORM STATE:
`;

function fmtKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function fmtVal(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    if (val === 0) return "0";
    const abs = Math.abs(val);
    if (abs >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (Number.isInteger(val)) return val.toLocaleString("en-US");
    if (abs < 10 && !Number.isInteger(val)) return val.toFixed(4);
    return val.toFixed(2);
  }
  const str = String(val);
  return str.length > 40 ? str.slice(0, 37) + "..." : str;
}

function formatFmpAsMarkdown(endpoint: string, data: unknown): string {
  if (!data) return "\n\n_No data returned._\n";

  let arr: Record<string, unknown>[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const nested = obj.historical ?? obj.data ?? obj.results;
    if (Array.isArray(nested)) arr = nested as Record<string, unknown>[];
    else arr = [obj];
  } else {
    return `\n\n${String(data)}\n`;
  }

  if (arr.length === 0) return "\n\n_No data returned._\n";

  const first = arr[0];
  if (typeof first !== "object" || first === null) {
    return `\n\n${JSON.stringify(arr.slice(0, 5))}\n`;
  }

  const keys = Object.keys(first).filter((k) => {
    const v = (first as Record<string, unknown>)[k];
    return v !== null && v !== undefined && typeof v !== "object";
  });

  if (keys.length === 0) return "\n\n_Complex nested data._\n";

  if (arr.length === 1) {
    const displayKeys = keys.slice(0, 25);
    let result = `\n\n**${fmtKey(endpoint)}**\n\n`;
    result += "| Metric | Value |\n| --- | --- |\n";
    for (const k of displayKeys) {
      result += `| **${fmtKey(k)}** | ${fmtVal((first as Record<string, unknown>)[k])} |\n`;
    }
    return result;
  }

  const displayKeys = keys.slice(0, 10);
  let table = `\n\n**${fmtKey(endpoint)}** (${arr.length} records)\n\n`;
  table += "| " + displayKeys.map(fmtKey).join(" | ") + " |\n";
  table += "| " + displayKeys.map(() => "---").join(" | ") + " |\n";

  const showCount = Math.min(arr.length, 12);
  for (let i = 0; i < showCount; i++) {
    const row = arr[i] as Record<string, unknown>;
    table += "| " + displayKeys.map((k) => fmtVal(row[k])).join(" | ") + " |\n";
  }

  if (arr.length > showCount) {
    table += `\n_Showing ${showCount} of ${arr.length} records._\n`;
  }

  return table;
}

const ALL_AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_fmp_data",
      description: "Fetch financial data from the FMP API. ALWAYS use this for any financial data request.",
      parameters: {
        type: "object",
        properties: {
          endpoint: { type: "string", description: "FMP API endpoint (e.g. quote, income-statement, balance-sheet-statement)" },
          params: { type: "object", description: "Query parameters object (e.g. {\"symbol\": \"AAPL\"})" },
        },
        required: ["endpoint"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tavily_search",
      description: "Search the web for current, real-time information. REQUIRED for queries about recent events, breaking news, today's happenings, or anything after your training cutoff. Use when user asks about latest/current/recent/today/breaking information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Specific search terms (e.g., 'Tesla stock news today')" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_symbol",
      description: "Navigate the chart to display a specific stock symbol",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_timeframe",
      description: "Change the chart time interval",
      parameters: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["1min", "5min", "15min", "30min", "1hour", "daily"] },
        },
        required: ["timeframe"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_chart_type",
      description: "Change chart visualization type",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["area", "line", "bar", "candlestick"] },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_indicator",
      description: "Toggle a technical indicator on the chart",
      parameters: {
        type: "object",
        properties: {
          indicator: { type: "string", enum: ["sma20", "sma50", "sma100", "sma200", "ema12", "ema26", "bollinger", "vwap", "volume", "rsi", "macd"] },
          enabled: { type: "boolean" },
        },
        required: ["indicator", "enabled"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_watchlist",
      description: "Add a symbol to the user's watchlist",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          name: { type: "string", description: "Company name" },
        },
        required: ["symbol", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_watchlist",
      description: "Remove a symbol from the user's watchlist",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_right_panel",
      description: "Switch the right panel view",
      parameters: {
        type: "object",
        properties: {
          view: { type: "string", enum: ["news", "economic"] },
        },
        required: ["view"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_left_tab",
      description: "Switch the left sidebar tab",
      parameters: {
        type: "object",
        properties: {
          tab: { type: "string", enum: ["overview", "gainers", "losers", "active"] },
        },
        required: ["tab"],
      },
    },
  },
];

const SERVER_TOOLS = new Set(["fetch_fmp_data", "tavily_search"]);

function getToolsForRequest(webSearchEnabled: boolean): typeof ALL_AI_TOOLS {
  if (webSearchEnabled) {
    console.log("[Tools] Including ALL tools (webSearch ON): fetch_fmp_data, tavily_search, change_symbol, etc.");
    return ALL_AI_TOOLS;
  }
  console.log("[Tools] Filtering OUT tavily_search (webSearch OFF)");
  return ALL_AI_TOOLS.filter(tool => tool.function.name !== "tavily_search");
}

const MODEL_CONFIGS: Record<string, { url: string; model: string }> = {
  "hypermind-6.5": {
    url: "https://router.huggingface.co/v1/chat/completions",
    model: "openai/gpt-oss-120b:cerebras",
  },
  "glm-5": {
    url: "https://router.huggingface.co/v1/chat/completions",
    model: "zai-org/GLM-5:novita",
  },
};

interface NativeToolCall {
  id: string;
  name: string;
  arguments: string;
}

async function streamOneLLMRound(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  modelConfig: { url: string; model: string },
  hfToken: string,
  chatMessages: Record<string, unknown>[],
  tools: typeof ALL_AI_TOOLS,
): Promise<{
  fullContent: string;
  nativeToolCalls: NativeToolCall[];
  textToolCalls: { tool: string; params: Record<string, unknown> }[];
}> {
  const hfRes = await fetch(modelConfig.url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages: chatMessages,
      tools: tools,
      stream: true,
      max_tokens: 16000,
      temperature: 0.7,
    }),
  });

  if (!hfRes.ok) {
    const errText = await hfRes.text();
    const errChunk = `\n\n_AI provider error: ${hfRes.status} ${errText}_\n`;
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ choices: [{ delta: { content: errChunk } }] })}\n\n`
    ));
    return { fullContent: errChunk, nativeToolCalls: [], textToolCalls: [] };
  }

  const reader = hfRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  const nativeMap = new Map<number, NativeToolCall>();
  const textToolCalls: { tool: string; params: Record<string, unknown> }[] = [];
  let streamCutoff = -1;

  readLoop: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") break readLoop;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta;

        if (delta?.content) {
          const prevLen = fullContent.length;
          fullContent += delta.content;

          if (streamCutoff === -1) {
            const tagIdx = fullContent.indexOf("<tool_call>");
            if (tagIdx !== -1) {
              streamCutoff = tagIdx;
            }
          }

          const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
          let match;
          while ((match = toolCallRegex.exec(fullContent)) !== null) {
            try {
              const tc = JSON.parse(match[1]);
              if (tc.tool && !textToolCalls.some(p => JSON.stringify(p) === JSON.stringify(tc))) {
                textToolCalls.push(tc);
              }
            } catch { /* skip malformed */ }
          }

          if (streamCutoff === -1) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
          } else if (prevLen < streamCutoff) {
            const beforeTag = fullContent.substring(prevLen, streamCutoff);
            if (beforeTag) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: beforeTag } }] })}\n\n`
              ));
            }
          }
        }

        if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = typeof tc.index === "number" ? tc.index : 0;
            if (!nativeMap.has(idx)) {
              nativeMap.set(idx, { id: tc.id || `call_${idx}_${Date.now()}`, name: "", arguments: "" });
            }
            const entry = nativeMap.get(idx)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name += tc.function.name;
            if (tc.function?.arguments) entry.arguments += tc.function.arguments;
          }
        }
      } catch { /* skip malformed SSE */ }
    }
  }

  if (textToolCalls.length > 0) {
    const lastIdx = fullContent.lastIndexOf("</tool_call>");
    if (lastIdx !== -1) {
      fullContent = fullContent.substring(0, lastIdx + "</tool_call>".length);
    }
  }

  const nativeToolCalls = Array.from(nativeMap.values()).filter(tc => tc.name);
  return { fullContent, nativeToolCalls, textToolCalls };
}

async function executeServerTool(
  tc: { tool: string; params: Record<string, unknown> },
  sendChunk: (content: string) => void,
): Promise<string> {
  if (tc.tool === "fetch_fmp_data") {
    try {
      const ep = (tc.params.endpoint as string) || "";
      const fp = (tc.params.params as Record<string, string>) || {};
      const fmpResult = await fmpFetch(ep, fp);
      const markdown = formatFmpAsMarkdown(ep, fmpResult);
      sendChunk(markdown);
      return markdown;
    } catch (e) {
      const errMsg = `Error fetching ${tc.params.endpoint}: ${e instanceof Error ? e.message : "unknown"}`;
      sendChunk(`\n\n_${errMsg}_\n`);
      return errMsg;
    }
  }
  if (tc.tool === "tavily_search" && TAVILY_API_KEY) {
    const query = (tc.params.query as string) || "";
    console.log(`[Tavily] Calling tavily_search with query: "${query}"`);
    if (!query) {
      console.log("[Tavily] ERROR: No query provided");
      return "No query provided";
    }
    try {
      const tavilyResult = await callTavilySearch(query);
      console.log(`[Tavily] Results received: ${tavilyResult.results?.length || 0} results, has answer: ${!!tavilyResult.answer}`);
      if (tavilyResult.results && tavilyResult.results.length > 0) {
        let result = "";
        if (tavilyResult.answer) {
          sendChunk(`\n\n${tavilyResult.answer}`);
          result = tavilyResult.answer;
        }
        const sourcesMarkdown = formatTavilySources(tavilyResult);
        sendChunk(sourcesMarkdown);
        console.log(`[Tavily] Successfully formatted and returned ${tavilyResult.results.length} results`);
        return result + sourcesMarkdown;
      }
      console.log("[Tavily] No results found");
      sendChunk("\n\n_No web results found._\n");
      return "No web results found.";
    } catch (e) {
      const errMsg = `Web search error: ${e instanceof Error ? e.message : "unknown"}`;
      console.error(`[Tavily] ERROR: ${errMsg}`);
      sendChunk(`\n\n_${errMsg}_\n`);
      return errMsg;
    }
  }
  return "Action executed on client.";
}

async function handleAIChat(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { messages, platformContext, model, webSearch, searchMode } = body;
    if (!messages || !Array.isArray(messages)) {
      return jsonResponse({ error: "Missing messages array" }, 400);
    }

    const HF_TOKEN = Deno.env.get("HF_TOKEN") ?? "";
    if (!HF_TOKEN) {
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    const modelKey = typeof model === "string" && MODEL_CONFIGS[model] ? model : "hypermind-6.5";
    const modelConfig = MODEL_CONFIGS[modelKey];

    const aiTools = getToolsForRequest(false);
    console.log(`[AI Chat] webSearch=${webSearch}, tools count=${aiTools.length}`);
    console.log(`[AI Chat] Available tools: ${aiTools.map(t => t.function.name).join(", ")}`);

    const contextStr = platformContext ? JSON.stringify(platformContext) : "{}";

    const webSearchSection = webSearch
      ? `WEB SEARCH:
- Web search is currently ENABLED and has ALREADY been performed by the system BEFORE your response.
- The search results appear below as "WEB SEARCH RESULTS". They are ALREADY AVAILABLE to you right now.
- You do NOT have a web search tool. You CANNOT perform additional searches. The search is already done.
- CRITICAL: Use the search results IMMEDIATELY in your response. Answer the user's question directly using the data from the search results.
- NEVER say "give me a moment", "let me look that up", "let me search", or anything implying you need to fetch data. The data is ALREADY HERE in the search results below.
- NEVER tell the user to visit a website or look something up themselves if the answer is in the search results.
- If the search results do not contain relevant information, answer based on your knowledge and conversation history. Do NOT tell the user to enable Web Search - it is already enabled.
- ALWAYS consider the FULL conversation history alongside the search results. If the user asks a follow-up about something discussed earlier, use the conversation history as your primary source and search results only if they add new information.`
      : `WEB SEARCH:
- The platform has a "Web Search" toggle that the user can enable.
- You do NOT have a web search tool. Web search is handled by the system.
- If the user asks about current events, non-financial topics, or anything requiring real-time web information, tell them: "Enable the **Web Search** toggle to search the web for this topic."`;

    const baseSystemContent = AI_SYSTEM_PROMPT.replace("{{WEB_SEARCH_SECTION}}", webSearchSection) + contextStr;
    const MAX_CHAIN_DEPTH = 5;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendChunk = (content: string) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
          ));
        };

        try {
          let systemContent = baseSystemContent;
          let tavilySourcesMd = "";
          const useAdvanced = searchMode === "advanced" && SERPER_API_KEY;

          const lastUserMsg = messages[messages.length - 1];
          const lastUserText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

          let searchQuery = lastUserText;
          if (webSearch && lastUserText && messages.length > 1) {
            const recentContext: string[] = [];
            const historySlice = messages.slice(-6, -1);
            for (const m of historySlice) {
              const c = typeof m.content === "string" ? m.content : "";
              if (c) recentContext.push(`${m.role}: ${c.slice(0, 200)}`);
            }
            if (recentContext.length > 0) {
              searchQuery = `${lastUserText} (context: ${recentContext.join("; ")})`;
            }
          }

          if (webSearch && useAdvanced) {
            if (searchQuery) {
              console.log(`[AI Chat] Advanced deep search for: "${searchQuery}"`);
              const sendStatus = (stage: string, count?: number) => {
                sendChunk(`<search_status>${JSON.stringify({ stage, count })}</search_status>`);
              };
              const advResult = await performAdvancedWebSearch(searchQuery, sendStatus);
              if (advResult.sources.length > 0) {
                systemContent += formatAdvancedSearchContext(advResult);
                const sourcesPayload = {
                  sources: advResult.sources.map((s) => ({
                    index: s.index,
                    title: s.title,
                    url: s.url,
                    domain: s.domain,
                    favicon: s.favicon,
                    snippet: s.snippet,
                    relevanceScore: s.relevanceScore,
                  })),
                  images: advResult.images.slice(0, 20),
                };
                sendChunk(`<search_sources>${JSON.stringify(sourcesPayload)}</search_sources>`);
                console.log(`[AI Chat] Advanced search found ${advResult.sources.length} sources`);

                const sid = body.sessionId || "";
                if (sid) {
                  supabase.from("web_search_results").insert({
                    session_id: sid,
                    query: searchQuery,
                    sources: sourcesPayload,
                    search_mode: "advanced",
                  }).then(() => {}).catch(() => {});
                }
              } else {
                systemContent += "\n\nWEB SEARCH RESULTS: No results found for this query.";
              }
            }
          } else if (webSearch && TAVILY_API_KEY) {
            if (searchQuery) {
              console.log(`[AI Chat] Pre-searching web for: "${searchQuery}"`);
              sendChunk(`<tool_call>${JSON.stringify({ tool: "tavily_search", params: { query: searchQuery } })}</tool_call>`);
              const tavilyResult = await callTavilySearch(searchQuery);
              if (tavilyResult.results && tavilyResult.results.length > 0) {
                systemContent += formatTavilyContext(tavilyResult);
                tavilySourcesMd = formatTavilySources(tavilyResult);
                console.log(`[AI Chat] Pre-search found ${tavilyResult.results.length} results`);
              } else {
                console.log("[AI Chat] Pre-search returned no results");
                systemContent += "\n\nWEB SEARCH RESULTS: No results found for this query. Answer based on your knowledge and suggest the user try a more specific search query if needed.";
              }
            }
          } else if (webSearch && !TAVILY_API_KEY && !useAdvanced) {
            console.error("[AI Chat] Web search enabled but no search service configured");
            systemContent += "\n\nNote: Web search was requested but the search service is not configured. Answer based on your knowledge.";
          }

          const systemMsg = { role: "system", content: systemContent };
          let chatMessages: Record<string, unknown>[] = [systemMsg, ...messages];

          for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
            console.log(`[AI Chat] Starting round ${depth + 1}/${MAX_CHAIN_DEPTH}`);
            const { fullContent, nativeToolCalls, textToolCalls } = await streamOneLLMRound(
              controller, encoder, modelConfig, HF_TOKEN, chatMessages, aiTools,
            );

            console.log(`[AI Chat] Round ${depth + 1} complete: nativeToolCalls=${nativeToolCalls.length}, textToolCalls=${textToolCalls.length}`);
            if (nativeToolCalls.length > 0) {
              console.log(`[AI Chat] Native tool calls: ${nativeToolCalls.map(tc => tc.name).join(", ")}`);
            }
            if (textToolCalls.length > 0) {
              console.log(`[AI Chat] Text tool calls: ${textToolCalls.map(tc => tc.tool).join(", ")}`);
            }

            const usedNative = nativeToolCalls.length > 0;

            type UnifiedCall = { tool: string; params: Record<string, unknown>; nativeId?: string };
            const allCalls: UnifiedCall[] = [];

            for (const ntc of nativeToolCalls) {
              try {
                const args = ntc.arguments ? JSON.parse(ntc.arguments) : {};
                allCalls.push({ tool: ntc.name, params: args, nativeId: ntc.id });
              } catch {
                allCalls.push({ tool: ntc.name, params: {}, nativeId: ntc.id });
              }
            }

            for (const ttc of textToolCalls) {
              if (!allCalls.some(a => a.tool === ttc.tool && JSON.stringify(a.params) === JSON.stringify(ttc.params))) {
                allCalls.push(ttc);
              }
            }

            if (allCalls.length === 0) {
              console.log(`[AI Chat] No tool calls in round ${depth + 1}, ending loop`);
              break;
            }

            console.log(`[AI Chat] Processing ${allCalls.length} tool calls: ${allCalls.map(tc => tc.tool).join(", ")}`);


            for (const tc of allCalls) {
              sendChunk(`<tool_call>${JSON.stringify({ tool: tc.tool, params: tc.params })}</tool_call>`);
            }

            const serverCalls = allCalls.filter(tc => SERVER_TOOLS.has(tc.tool));
            console.log(`[AI Chat] Server-side tools to execute: ${serverCalls.length} (${serverCalls.map(tc => tc.tool).join(", ") || "none"})`);

            const resultMap = new Map<string, string>();
            for (const tc of allCalls) {
              if (SERVER_TOOLS.has(tc.tool)) {
                console.log(`[AI Chat] Executing server tool: ${tc.tool} with params:`, JSON.stringify(tc.params));
                const result = await executeServerTool(tc, sendChunk);
                console.log(`[AI Chat] Server tool ${tc.tool} completed, result length: ${result.length}`);
                if (tc.nativeId) resultMap.set(tc.nativeId, result);
                else resultMap.set(`${tc.tool}:${JSON.stringify(tc.params)}`, result);
              }
            }

            if (serverCalls.length === 0) {
              console.log(`[AI Chat] No server tools called in round ${depth + 1}, ending loop`);
              break;
            }

            if (usedNative) {
              const assistantMsg: Record<string, unknown> = {
                role: "assistant",
                content: fullContent || null,
                tool_calls: nativeToolCalls.map(ntc => ({
                  id: ntc.id,
                  type: "function",
                  function: { name: ntc.name, arguments: ntc.arguments },
                })),
              };
              chatMessages = [...chatMessages, assistantMsg];

              for (const ntc of nativeToolCalls) {
                const resultContent = SERVER_TOOLS.has(ntc.name)
                  ? (resultMap.get(ntc.id) || "No data returned")
                  : "Action executed on client.";
                chatMessages.push({
                  role: "tool",
                  tool_call_id: ntc.id,
                  content: resultContent,
                });
              }
            } else {
              const resultParts = Array.from(resultMap.values());
              chatMessages = [
                ...chatMessages,
                { role: "assistant", content: fullContent },
                {
                  role: "user",
                  content: `Here are the results:\n${resultParts.join("\n")}\n\nContinue your response. You may make more tool calls if needed.`,
                },
              ];
            }
          }

          if (tavilySourcesMd) {
            sendChunk(tavilySourcesMd);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Stream error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "AI chat error" }, 500);
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
      case "batch-quotes": {
        const symbols = (url.searchParams.get("symbols") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const quotes = await fetchBatchQuotes(symbols);
        return jsonResponse({ quotes });
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
      case "market-overview": {
        const overview = await fetchMarketOverview();
        return jsonResponse({ overview });
      }
      case "market-movers": {
        const movers = await fetchMarketMovers();
        return jsonResponse(movers);
      }
      case "sector-performance": {
        const sectors = await fetchSectorPerformance();
        return jsonResponse({ sectors });
      }
      case "historical-chart": {
        const symbol = url.searchParams.get("symbol") ?? "";
        const timeframe = url.searchParams.get("timeframe") ?? "daily";
        const chart = await fetchHistoricalChart(symbol, timeframe);
        return jsonResponse({ chart });
      }
      case "company-profile": {
        const symbol = url.searchParams.get("symbol") ?? "";
        const profile = await fetchCompanyProfile(symbol);
        return jsonResponse({ profile });
      }
      case "earnings-calendar": {
        const earnings = await fetchEarningsCalendar();
        return jsonResponse({ earnings });
      }
      case "economic-calendar": {
        const events = await fetchEconomicCalendar();
        return jsonResponse({ events });
      }
      case "market-news": {
        const marketNews = await fetchMarketNews();
        return jsonResponse({ news: marketNews });
      }
      case "fmp-proxy": {
        const endpoint = url.searchParams.get("endpoint") ?? "";
        if (!endpoint) return jsonResponse({ error: "Missing endpoint param" }, 400);
        const paramsRaw = url.searchParams.get("params");
        let fmpParams: Record<string, string> = {};
        if (paramsRaw) {
          try { fmpParams = JSON.parse(paramsRaw); } catch { /* ignore */ }
        }
        for (const [k, v] of url.searchParams.entries()) {
          if (k !== "feed" && k !== "endpoint" && k !== "params") {
            fmpParams[k] = v;
          }
        }
        const cacheKey = `fmp-proxy:${endpoint}:${JSON.stringify(fmpParams)}`;
        const ttl = endpoint.includes("chart") || endpoint.includes("quote") ? 30_000 : 300_000;
        const proxyCache = await getCached(cacheKey, ttl);
        if (proxyCache) return jsonResponse({ data: proxyCache });
        const proxyData = await fmpFetch(endpoint, fmpParams);
        await setCache(cacheKey, proxyData);
        return jsonResponse({ data: proxyData });
      }
      case "ai-sessions": {
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("id, title, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);
        return jsonResponse({ sessions: sessions ?? [] });
      }
      case "ai-history": {
        const sessionId = url.searchParams.get("sessionId") ?? "";
        if (!sessionId) return jsonResponse({ error: "Missing sessionId" }, 400);
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("id, session_id, role, content, tool_calls, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });
        return jsonResponse({ messages: messages ?? [] });
      }
      case "ai-save": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const body = await req.json();
        const { sessionId, role, content, toolCalls, title } = body;
        if (!sessionId || !role) return jsonResponse({ error: "Missing fields" }, 400);
        const sessionRow: Record<string, unknown> = {
          id: sessionId,
          updated_at: new Date().toISOString(),
        };
        if (title !== undefined) sessionRow.title = title;
        await supabase.from("chat_sessions").upsert(sessionRow, {
          onConflict: "id",
          ignoreDuplicates: false,
        });
        const { error: msgErr } = await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role,
          content: content || "",
          tool_calls: toolCalls || null,
        });
        if (msgErr) return jsonResponse({ error: msgErr.message }, 500);
        return jsonResponse({ ok: true });
      }
      case "web-search-sources": {
        const sessionId = url.searchParams.get("sessionId") ?? "";
        if (!sessionId) return jsonResponse({ error: "Missing sessionId" }, 400);
        const { data: rows } = await supabase
          .from("web_search_results")
          .select("id, session_id, query, sources, search_mode, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1);
        const latest = rows?.[0] ?? null;
        return jsonResponse({ searchResult: latest });
      }
      case "ai-rename-session": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const body = await req.json();
        const { sessionId, title } = body;
        if (!sessionId || typeof title !== "string") return jsonResponse({ error: "Missing sessionId or title" }, 400);
        const { error: renameErr } = await supabase
          .from("chat_sessions")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", sessionId);
        if (renameErr) return jsonResponse({ error: renameErr.message }, 500);
        return jsonResponse({ ok: true });
      }
      case "ai-delete-session": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const body = await req.json();
        const { sessionId } = body;
        if (!sessionId) return jsonResponse({ error: "Missing sessionId" }, 400);
        const { error: delErr } = await supabase
          .from("chat_sessions")
          .delete()
          .eq("id", sessionId);
        if (delErr) return jsonResponse({ error: delErr.message }, 500);
        return jsonResponse({ ok: true });
      }
      case "ai-delete-sessions": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const body = await req.json();
        const { sessionIds } = body;
        if (!Array.isArray(sessionIds) || sessionIds.length === 0) return jsonResponse({ error: "Missing sessionIds array" }, 400);
        const { error: bulkErr } = await supabase
          .from("chat_sessions")
          .delete()
          .in("id", sessionIds);
        if (bulkErr) return jsonResponse({ error: bulkErr.message }, 500);
        return jsonResponse({ ok: true, deleted: sessionIds.length });
      }
      case "ai-delete-all-sessions": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        const { error: allErr } = await supabase
          .from("chat_sessions")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (allErr) return jsonResponse({ error: allErr.message }, 500);
        return jsonResponse({ ok: true });
      }
      case "ai-chat": {
        if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
        return handleAIChat(req);
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
