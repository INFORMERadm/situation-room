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

async function fetchEconomicCalendar() {
  const cached = await getCached("economic-calendar", 300_000);
  if (cached) return cached;

  try {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    const nextFriday = new Date(thisMonday);
    nextFriday.setDate(thisMonday.getDate() + 11);
    const from = thisMonday.toISOString().slice(0, 10);
    const to = nextFriday.toISOString().slice(0, 10);

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
    })).filter((e) => e.event.length > 0);

    mapped.sort((a, b) => a.date.localeCompare(b.date));
    const result = mapped.slice(0, 50);

    if (result.length > 0) {
      await setCache("economic-calendar", result);
      return result;
    }
  } catch { /* fall through to fallback */ }

  const todayStr = new Date().toISOString().slice(0, 10);
  const d = (offset: number, time: string) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().slice(0, 10) + "T" + time;
  };
  const fallback = [
    { event: "MBA Mortgage Applications", date: d(0, "07:00:00"), country: "US", impact: "Medium", previous: -2.0, estimate: null, actual: null },
    { event: "Wholesale Inventories (MoM)", date: d(0, "10:00:00"), country: "US", impact: "Low", previous: 0.2, estimate: 0.1, actual: null },
    { event: "10-Year Note Auction", date: d(0, "13:00:00"), country: "US", impact: "Medium", previous: null, estimate: null, actual: null },
    { event: "CPI (MoM)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 0.4, estimate: 0.3, actual: null },
    { event: "CPI (YoY)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 2.9, estimate: 2.9, actual: null },
    { event: "Core CPI (MoM)", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 0.2, estimate: 0.3, actual: null },
    { event: "Initial Jobless Claims", date: d(1, "08:30:00"), country: "US", impact: "High", previous: 219000, estimate: 218000, actual: null },
    { event: "PPI (MoM)", date: d(2, "08:30:00"), country: "US", impact: "Medium", previous: 0.2, estimate: 0.3, actual: null },
    { event: "ECB Interest Rate Decision", date: d(2, "07:45:00"), country: "EU", impact: "High", previous: 2.9, estimate: 2.65, actual: null },
    { event: "Retail Sales (MoM)", date: d(3, "08:30:00"), country: "US", impact: "High", previous: 0.4, estimate: 0.3, actual: null },
    { event: "Industrial Production (MoM)", date: d(3, "09:15:00"), country: "US", impact: "Medium", previous: 0.9, estimate: 0.3, actual: null },
    { event: "GDP (QoQ)", date: d(3, "02:00:00"), country: "GB", impact: "High", previous: 0.1, estimate: 0.2, actual: null },
    { event: "Empire State Manufacturing Index", date: d(7, "08:30:00"), country: "US", impact: "Medium", previous: -12.6, estimate: -1.0, actual: null },
    { event: "Building Permits", date: d(8, "08:30:00"), country: "US", impact: "Medium", previous: 1482000, estimate: 1460000, actual: null },
    { event: "FOMC Meeting Minutes", date: d(8, "14:00:00"), country: "US", impact: "High", previous: null, estimate: null, actual: null },
    { event: "Philadelphia Fed Manufacturing Index", date: d(9, "08:30:00"), country: "US", impact: "Medium", previous: 44.3, estimate: 20.0, actual: null },
    { event: "Existing Home Sales", date: d(10, "10:00:00"), country: "US", impact: "Medium", previous: 4240000, estimate: 4200000, actual: null },
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
