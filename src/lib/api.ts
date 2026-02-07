const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function fetchFeed(feed: string) {
  const res = await fetch(`${API_BASE}/global-monitor?feed=${feed}`, { headers });
  if (!res.ok) throw new Error(`Feed ${feed} failed: ${res.status}`);
  return res.json();
}

export async function fetchSymbolSearch(query: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=search-symbol&query=${encodeURIComponent(query)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

export async function fetchQuote(symbol: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=quote&symbol=${encodeURIComponent(symbol)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
  const json = await res.json();
  return json.quote ?? null;
}

export async function fetchMarketOverview() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=market-overview`, { headers });
  if (!res.ok) throw new Error(`Market overview failed: ${res.status}`);
  const json = await res.json();
  return json.overview ?? [];
}

export async function fetchMarketMovers() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=market-movers`, { headers });
  if (!res.ok) throw new Error(`Market movers failed: ${res.status}`);
  return res.json();
}

export async function fetchSectorPerformance() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=sector-performance`, { headers });
  if (!res.ok) throw new Error(`Sector performance failed: ${res.status}`);
  const json = await res.json();
  return json.sectors ?? [];
}

export async function fetchHistoricalChart(symbol: string, timeframe: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=historical-chart&symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Chart failed: ${res.status}`);
  const json = await res.json();
  return json.chart ?? [];
}

export async function fetchCompanyProfile(symbol: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=company-profile&symbol=${encodeURIComponent(symbol)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Profile failed: ${res.status}`);
  const json = await res.json();
  return json.profile ?? null;
}

export async function fetchEarningsCalendar() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=earnings-calendar`, { headers });
  if (!res.ok) throw new Error(`Earnings calendar failed: ${res.status}`);
  const json = await res.json();
  return json.earnings ?? [];
}

export async function fetchEconomicCalendar() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=economic-calendar`, { headers });
  if (!res.ok) throw new Error(`Economic calendar failed: ${res.status}`);
  const json = await res.json();
  return json.events ?? [];
}

export async function fetchMarketNews() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=market-news`, { headers });
  if (!res.ok) throw new Error(`Market news failed: ${res.status}`);
  const json = await res.json();
  return json.news ?? [];
}
