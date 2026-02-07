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
