import { supabase } from './supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    const bufferSeconds = 60;

    if (expiresAt - bufferSeconds < now) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData?.session) {
        return {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        };
      }
      return {
        Authorization: `Bearer ${refreshData.session.access_token}`,
        'Content-Type': 'application/json',
      };
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch {
    return {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delay = 1000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || attempt === retries) return res;
      if (res.status === 401) {
        const { data } = await supabase.auth.refreshSession();
        const token = data?.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
        options = {
          ...options,
          headers: {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
          },
        };
      }
    } catch (err) {
      if (attempt === retries) throw err;
    }
    await new Promise(r => setTimeout(r, delay * (attempt + 1)));
  }
  return fetch(url, options);
}

export async function fetchFeed(feed: string) {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=${feed}`, { headers });
  if (!res.ok) throw new Error(`Feed ${feed} failed: ${res.status}`);
  return res.json();
}

export async function fetchSymbolSearch(query: string) {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(
    `${API_BASE}/global-monitor?feed=search-symbol&query=${encodeURIComponent(query)}`,
    { headers },
    1,
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

export async function fetchQuote(symbol: string) {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(
    `${API_BASE}/global-monitor?feed=quote&symbol=${encodeURIComponent(symbol)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
  const json = await res.json();
  return json.quote ?? null;
}

export async function fetchBatchQuotes(symbols: string[]) {
  if (symbols.length === 0) return {};
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(
    `${API_BASE}/global-monitor?feed=batch-quotes&symbols=${encodeURIComponent(symbols.join(','))}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Batch quotes failed: ${res.status}`);
  const json = await res.json();
  return json.quotes ?? {};
}

export async function fetchMarketOverview() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=market-overview`, { headers });
  if (!res.ok) throw new Error(`Market overview failed: ${res.status}`);
  const json = await res.json();
  return json.overview ?? [];
}

export async function fetchMarketMovers() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=market-movers`, { headers });
  if (!res.ok) throw new Error(`Market movers failed: ${res.status}`);
  return res.json();
}

export async function fetchSectorPerformance() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=sector-performance`, { headers });
  if (!res.ok) throw new Error(`Sector performance failed: ${res.status}`);
  const json = await res.json();
  return json.sectors ?? [];
}

export async function fetchHistoricalChart(symbol: string, timeframe: string) {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(
    `${API_BASE}/global-monitor?feed=historical-chart&symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Chart failed: ${res.status}`);
  const json = await res.json();
  return json.chart ?? [];
}

export async function fetchCompanyProfile(symbol: string) {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(
    `${API_BASE}/global-monitor?feed=company-profile&symbol=${encodeURIComponent(symbol)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Profile failed: ${res.status}`);
  const json = await res.json();
  return json.profile ?? null;
}

export async function fetchEarningsCalendar() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=earnings-calendar`, { headers });
  if (!res.ok) throw new Error(`Earnings calendar failed: ${res.status}`);
  const json = await res.json();
  return json.earnings ?? [];
}

export async function fetchEconomicCalendar() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=economic-calendar`, { headers });
  if (!res.ok) throw new Error(`Economic calendar failed: ${res.status}`);
  const json = await res.json();
  return json.events ?? [];
}

export async function fetchMarketNews() {
  const headers = await getAuthHeaders();
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?feed=market-news`, { headers });
  if (!res.ok) throw new Error(`Market news failed: ${res.status}`);
  const json = await res.json();
  return json.news ?? [];
}

export async function fetchFmpProxy(endpoint: string, params: Record<string, string> = {}) {
  const headers = await getAuthHeaders();
  const qs = new URLSearchParams({
    feed: 'fmp-proxy',
    endpoint,
    params: JSON.stringify(params),
  });
  const res = await fetchWithRetry(`${API_BASE}/global-monitor?${qs.toString()}`, { headers });
  if (!res.ok) throw new Error(`FMP proxy failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MCPServerInput {
  url: string;
  connectionId: string;
  namespace: string;
  displayName: string;
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
  mcpServers?: MCPServerInput[],
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/global-monitor?feed=ai-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, platformContext, model, webSearch, searchMode, mcpServers }),
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
  userId?: string,
) {
  const headers = await getAuthHeaders();
  await fetch(`${API_BASE}/global-monitor?feed=ai-save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, role, content, toolCalls, title, userId }),
  });
}

export async function loadAIHistory(sessionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=ai-history&sessionId=${encodeURIComponent(sessionId)}`,
    { headers },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.messages ?? [];
}

export async function loadAISessions() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-sessions`, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  return json.sessions ?? [];
}

export async function renameAISession(sessionId: string, title: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-rename-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, title }),
  });
  if (!res.ok) throw new Error('Rename failed');
  return res.json();
}

export async function deleteAISession(sessionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-delete-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

export async function deleteAISessions(sessionIds: string[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-delete-sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionIds }),
  });
  if (!res.ok) throw new Error('Bulk delete failed');
  return res.json();
}

export async function deleteAllAISessions() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/global-monitor?feed=ai-delete-all-sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Delete all failed');
  return res.json();
}

export interface ChatDocument {
  id: string;
  user_id: string;
  session_id: string | null;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string | null;
  extracted_text: string;
  char_count: number;
  status: 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
}

export async function uploadChatDocument(
  file: File,
  sessionId: string,
): Promise<{ documentId: string; filename: string; charCount: number; status: string; errorMessage: string | null }> {
  const authHeaders = await getAuthHeaders();
  const { 'Content-Type': _ct, ...headersWithoutContentType } = authHeaders;

  const form = new FormData();
  form.append('file', file);
  form.append('sessionId', sessionId);

  const res = await fetch(`${API_BASE}/extract-document`, {
    method: 'POST',
    headers: headersWithoutContentType,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function getSessionDocument(sessionId: string): Promise<ChatDocument | null> {
  const { data, error } = await supabase
    .from('chat_documents')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as ChatDocument | null;
}

export async function fetchWebSearchSources(sessionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/global-monitor?feed=web-search-sources&sessionId=${encodeURIComponent(sessionId)}`,
    { headers },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.searchResult ?? null;
}
