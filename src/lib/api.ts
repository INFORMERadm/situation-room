const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function fetchFeed(feed: string) {
  const res = await fetch(`${API_BASE}/global-monitor?feed=${feed}`, { headers });
  if (!res.ok) throw new Error(`Feed ${feed} failed: ${res.status}`);
  return res.json();
}
