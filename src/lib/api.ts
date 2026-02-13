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

export async function fetchBatchQuotes(symbols: string[]) {
  if (symbols.length === 0) return {};
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=batch-quotes&symbols=${encodeURIComponent(symbols.join(','))}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Batch quotes failed: ${res.status}`);
  const json = await res.json();
  return json.quotes ?? {};
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

export async function fetchFmpProxy(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({
    feed: 'fmp-proxy',
    endpoint,
    params: JSON.stringify(params),
  });
  const res = await fetch(`${API_BASE}/global-monitor?${qs.toString()}`, { headers });
  if (!res.ok) throw new Error(`FMP proxy failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function streamAIChat(
  messages: AIMessage[],
  platformContext: Record<string, unknown>,
  onChunk: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
  model?: string,
  webSearch?: boolean,
  searchMode?: string,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/global-monitor?feed=ai-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, platformContext, model, webSearch, searchMode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        onError(errJson.error || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError('No response body'); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            onDone(fullText);
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) { onError(parsed.error); return; }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch { /* skip */ }
        }
      }
      onDone(fullText);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        onError((e as Error).message || 'Stream failed');
      }
    }
  })();

  return controller;
}

export async function saveAIMessage(
  sessionId: string,
  role: string,
  content: string,
  toolCalls?: unknown,
  title?: string,
) {
  await fetch(`${API_BASE}/global-monitor?feed=ai-save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, role, content, toolCalls, title }),
  });
}

export async function loadAIHistory(sessionId: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=ai-history&sessionId=${encodeURIComponent(sessionId)}`,
    { headers },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.messages ?? [];
}

export async function loadAISessions() {
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-sessions`, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  return json.sessions ?? [];
}

export async function fetchWebSearchSources(sessionId: string) {
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=web-search-sources&sessionId=${encodeURIComponent(sessionId)}`,
    { headers },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.searchResult ?? null;
}
