import type { Workspace } from '../context/PlatformContext';

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface ParsedAIResponse {
  text: string;
  toolCalls: ToolCall[];
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  const toolCalls: ToolCall[] = [];
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match;
  while ((match = toolCallRegex.exec(raw)) !== null) {
    try {
      const tc = JSON.parse(match[1]);
      if (tc.tool) toolCalls.push(tc);
    } catch { /* skip malformed */ }
  }

  let text = raw.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  text = text.replace(/<search_status>[\s\S]*?<\/search_status>/g, '').trim();
  text = text.replace(/<search_sources>[\s\S]*?<\/search_sources>/g, '').trim();

  return { text, toolCalls };
}

const CHART_NAV_TOOLS = new Set([
  'change_symbol',
  'change_timeframe',
  'change_chart_type',
  'toggle_indicator',
  'add_to_watchlist',
]);

export function isChartNavToolCall(tc: ToolCall): boolean {
  return CHART_NAV_TOOLS.has(tc.tool);
}

export function extractSymbolFromToolCall(tc: ToolCall): string | null {
  if (tc.tool === 'change_symbol' || tc.tool === 'add_to_watchlist') {
    const symbol = (tc.params.symbol as string) || '';
    return symbol ? symbol.toUpperCase() : null;
  }
  return null;
}

const TIMEZONE_MAP: Record<string, { label: string; zone: string }> = {
  'new york': { label: 'New York', zone: 'America/New_York' },
  'london': { label: 'London', zone: 'Europe/London' },
  'tokyo': { label: 'Tokyo', zone: 'Asia/Tokyo' },
  'sydney': { label: 'Sydney', zone: 'Australia/Sydney' },
  'dubai': { label: 'Dubai', zone: 'Asia/Dubai' },
  'hong kong': { label: 'Hong Kong', zone: 'Asia/Hong_Kong' },
  'singapore': { label: 'Singapore', zone: 'Asia/Singapore' },
  'shanghai': { label: 'Shanghai', zone: 'Asia/Shanghai' },
  'mumbai': { label: 'Mumbai', zone: 'Asia/Kolkata' },
  'frankfurt': { label: 'Frankfurt', zone: 'Europe/Berlin' },
  'paris': { label: 'Paris', zone: 'Europe/Paris' },
  'zurich': { label: 'Zurich', zone: 'Europe/Zurich' },
  'moscow': { label: 'Moscow', zone: 'Europe/Moscow' },
  'sao paulo': { label: 'Sao Paulo', zone: 'America/Sao_Paulo' },
  'chicago': { label: 'Chicago', zone: 'America/Chicago' },
  'los angeles': { label: 'Los Angeles', zone: 'America/Los_Angeles' },
  'toronto': { label: 'Toronto', zone: 'America/Toronto' },
  'seoul': { label: 'Seoul', zone: 'Asia/Seoul' },
  'taipei': { label: 'Taipei', zone: 'Asia/Taipei' },
  'jakarta': { label: 'Jakarta', zone: 'Asia/Jakarta' },
  'auckland': { label: 'Auckland', zone: 'Pacific/Auckland' },
  'johannesburg': { label: 'Johannesburg', zone: 'Africa/Johannesburg' },
  'cairo': { label: 'Cairo', zone: 'Africa/Cairo' },
  'istanbul': { label: 'Istanbul', zone: 'Europe/Istanbul' },
  'riyadh': { label: 'Riyadh', zone: 'Asia/Riyadh' },
  'berlin': { label: 'Frankfurt', zone: 'Europe/Berlin' },
  'tbilisi': { label: 'Tbilisi', zone: 'Asia/Tbilisi' },
  'dallas': { label: 'Dallas', zone: 'America/Chicago' },
  'denver': { label: 'Denver', zone: 'America/Denver' },
  'phoenix': { label: 'Phoenix', zone: 'America/Phoenix' },
  'honolulu': { label: 'Honolulu', zone: 'Pacific/Honolulu' },
  'anchorage': { label: 'Anchorage', zone: 'America/Anchorage' },
  'bangkok': { label: 'Bangkok', zone: 'Asia/Bangkok' },
  'kuala lumpur': { label: 'Kuala Lumpur', zone: 'Asia/Kuala_Lumpur' },
  'rome': { label: 'Rome', zone: 'Europe/Rome' },
  'madrid': { label: 'Madrid', zone: 'Europe/Madrid' },
  'amsterdam': { label: 'Amsterdam', zone: 'Europe/Amsterdam' },
  'prague': { label: 'Prague', zone: 'Europe/Prague' },
  'vienna': { label: 'Vienna', zone: 'Europe/Vienna' },
  'warsaw': { label: 'Warsaw', zone: 'Europe/Warsaw' },
  'athens': { label: 'Athens', zone: 'Europe/Athens' },
  'lisbon': { label: 'Lisbon', zone: 'Europe/Lisbon' },
  'mexico city': { label: 'Mexico City', zone: 'America/Mexico_City' },
  'buenos aires': { label: 'Buenos Aires', zone: 'America/Argentina/Buenos_Aires' },
  'lima': { label: 'Lima', zone: 'America/Lima' },
  'bogota': { label: 'Bogota', zone: 'America/Bogota' },
  'santiago': { label: 'Santiago', zone: 'America/Santiago' },
  'nairobi': { label: 'Nairobi', zone: 'Africa/Nairobi' },
  'lagos': { label: 'Lagos', zone: 'Africa/Lagos' },
  'doha': { label: 'Doha', zone: 'Asia/Qatar' },
  'abu dhabi': { label: 'Abu Dhabi', zone: 'Asia/Dubai' },
  'karachi': { label: 'Karachi', zone: 'Asia/Karachi' },
  'dhaka': { label: 'Dhaka', zone: 'Asia/Dhaka' },
  'colombo': { label: 'Colombo', zone: 'Asia/Colombo' },
  'hanoi': { label: 'Hanoi', zone: 'Asia/Ho_Chi_Minh' },
  'ho chi minh': { label: 'Ho Chi Minh', zone: 'Asia/Ho_Chi_Minh' },
  'manila': { label: 'Manila', zone: 'Asia/Manila' },
  'beijing': { label: 'Beijing', zone: 'Asia/Shanghai' },
  'osaka': { label: 'Osaka', zone: 'Asia/Tokyo' },
  'san francisco': { label: 'San Francisco', zone: 'America/Los_Angeles' },
  'seattle': { label: 'Seattle', zone: 'America/Los_Angeles' },
  'vancouver': { label: 'Vancouver', zone: 'America/Vancouver' },
  'montreal': { label: 'Montreal', zone: 'America/Toronto' },
  'salzburg': { label: 'Salzburg', zone: 'Europe/Vienna' },
  'dublin': { label: 'Dublin', zone: 'Europe/Dublin' },
  'helsinki': { label: 'Helsinki', zone: 'Europe/Helsinki' },
  'stockholm': { label: 'Stockholm', zone: 'Europe/Stockholm' },
  'oslo': { label: 'Oslo', zone: 'Europe/Oslo' },
  'copenhagen': { label: 'Copenhagen', zone: 'Europe/Copenhagen' },
  'bucharest': { label: 'Bucharest', zone: 'Europe/Bucharest' },
  'kyiv': { label: 'Kyiv', zone: 'Europe/Kyiv' },
  'kiev': { label: 'Kyiv', zone: 'Europe/Kyiv' },
  'st. petersburg': { label: 'St. Petersburg', zone: 'Europe/Moscow' },
  'saint petersburg': { label: 'St. Petersburg', zone: 'Europe/Moscow' },
  'tehran': { label: 'Tehran', zone: 'Asia/Tehran' },
  'baghdad': { label: 'Baghdad', zone: 'Asia/Baghdad' },
  'jerusalem': { label: 'Jerusalem', zone: 'Asia/Jerusalem' },
  'tel aviv': { label: 'Tel Aviv', zone: 'Asia/Jerusalem' },
  'beirut': { label: 'Beirut', zone: 'Asia/Beirut' },
  'kathmandu': { label: 'Kathmandu', zone: 'Asia/Kathmandu' },
  'perth': { label: 'Perth', zone: 'Australia/Perth' },
  'melbourne': { label: 'Melbourne', zone: 'Australia/Melbourne' },
  'brisbane': { label: 'Brisbane', zone: 'Australia/Brisbane' },
};

function resolveTimezone(city: string): { label: string; zone: string } | null {
  const key = city.toLowerCase().trim();
  if (TIMEZONE_MAP[key]) return TIMEZONE_MAP[key];
  const partial = Object.keys(TIMEZONE_MAP).find(k => k.includes(key) || key.includes(k));
  if (partial) return TIMEZONE_MAP[partial];
  return null;
}

const WORKSPACE_ALIASES: Record<string, { id: string; label: string }> = {
  'markets': { id: 'markets', label: 'Markets' },
  'market': { id: 'markets', label: 'Markets' },
  'stocks': { id: 'markets', label: 'Markets' },
  'trading': { id: 'markets', label: 'Markets' },
  'finance': { id: 'markets', label: 'Markets' },
  'news': { id: 'news', label: 'News' },
  'news deck': { id: 'news', label: 'News' },
  'newsdeck': { id: 'news', label: 'News' },
  'pa': { id: 'pa', label: 'PA' },
  'personal assistant': { id: 'pa', label: 'PA' },
  'assistant': { id: 'pa', label: 'PA' },
  'law': { id: 'law', label: 'Law' },
  'legal': { id: 'law', label: 'Law' },
  'flights': { id: 'flights', label: 'War Map' },
  'flight': { id: 'flights', label: 'War Map' },
  'war map': { id: 'flights', label: 'War Map' },
  'warmap': { id: 'flights', label: 'War Map' },
  'map': { id: 'flights', label: 'War Map' },
  'flight tracker': { id: 'flights', label: 'War Map' },
  'aviation': { id: 'flights', label: 'War Map' },
  'geopolitical': { id: 'flights', label: 'War Map' },
  'military': { id: 'flights', label: 'War Map' },
  'osint': { id: 'flights', label: 'War Map' },
};

function resolveWorkspace(name: string): { id: string; label: string } | null {
  const key = name.toLowerCase().trim();
  if (WORKSPACE_ALIASES[key]) return WORKSPACE_ALIASES[key];
  const partial = Object.keys(WORKSPACE_ALIASES).find(k => k.includes(key) || key.includes(k));
  if (partial) return WORKSPACE_ALIASES[partial];
  return null;
}

export interface CreateAlertParams {
  alert_type: 'keyword' | 'price';
  name: string;
  keywords?: string[];
  symbol?: string;
  price_condition?: 'above' | 'below';
  price_target?: number;
  natural_language_query?: string;
}

export interface PlatformActions {
  selectSymbol: (symbol: string) => void;
  setChartTimeframe: (tf: string) => void;
  setChartType: (type: string) => void;
  toggleIndicator: (id: string, enabled: boolean) => void;
  addToWatchlist: (symbol: string, name: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  createWatchlist: (name: string) => Promise<void>;
  switchWatchlist: (name: string) => string;
  setRightPanelView: (view: 'news' | 'economic') => void;
  setLeftTab: (tab: string) => void;
  collapseChat: () => void;
  addToTicker: (symbol: string) => void;
  removeFromTicker: (symbol: string) => void;
  addClock: (label: string, zone: string) => void;
  removeClock: (zone: string) => void;
  setActiveWorkspace: (ws: Workspace) => void;
  createAlert: (params: CreateAlertParams) => Promise<string>;
}

export async function executeToolCall(tc: ToolCall, actions: PlatformActions): Promise<string> {
  switch (tc.tool) {
    case 'change_symbol': {
      const symbol = (tc.params.symbol as string) || '';
      if (symbol) {
        actions.selectSymbol(symbol.toUpperCase());
        actions.collapseChat();
        return `Navigated to ${symbol.toUpperCase()}`;
      }
      return 'Missing symbol';
    }
    case 'change_timeframe': {
      const tf = (tc.params.timeframe as string) || 'daily';
      actions.setChartTimeframe(tf);
      actions.collapseChat();
      return `Timeframe set to ${tf}`;
    }
    case 'change_chart_type': {
      const type = (tc.params.type as string) || 'area';
      actions.setChartType(type);
      actions.collapseChat();
      return `Chart type set to ${type}`;
    }
    case 'toggle_indicator': {
      const id = (tc.params.indicator as string) || '';
      const enabled = tc.params.enabled !== false;
      if (id) {
        actions.toggleIndicator(id, enabled);
        actions.collapseChat();
        return `${id} ${enabled ? 'enabled' : 'disabled'}`;
      }
      return 'Missing indicator';
    }
    case 'create_watchlist': {
      const name = (tc.params.name as string) || '';
      if (name) {
        await actions.createWatchlist(name);
        return `Created watchlist "${name}"`;
      }
      return 'Missing watchlist name';
    }
    case 'switch_watchlist': {
      const name = (tc.params.name as string) || '';
      if (name) {
        const result = actions.switchWatchlist(name);
        return result;
      }
      return 'Missing watchlist name';
    }
    case 'add_to_watchlist': {
      const symbol = (tc.params.symbol as string) || '';
      const name = (tc.params.name as string) || symbol;
      if (symbol) {
        actions.addToWatchlist(symbol.toUpperCase(), name);
        actions.selectSymbol(symbol.toUpperCase());
        actions.collapseChat();
        return `Added ${symbol.toUpperCase()} to watchlist`;
      }
      return 'Missing symbol';
    }
    case 'remove_from_watchlist': {
      const symbol = (tc.params.symbol as string) || '';
      if (symbol) {
        actions.removeFromWatchlist(symbol.toUpperCase());
        return `Removed ${symbol.toUpperCase()} from watchlist`;
      }
      return 'Missing symbol';
    }
    case 'switch_right_panel': {
      const view = (tc.params.view as 'news' | 'economic') || 'news';
      actions.setRightPanelView(view);
      return `Right panel: ${view}`;
    }
    case 'switch_left_tab': {
      const tab = (tc.params.tab as string) || 'overview';
      actions.setLeftTab(tab);
      return `Left tab: ${tab}`;
    }
    case 'add_to_ticker': {
      const symbol = (tc.params.symbol as string) || '';
      if (symbol) {
        actions.addToTicker(symbol.toUpperCase());
        return `Added ${symbol.toUpperCase()} to ticker tape`;
      }
      return 'Missing symbol';
    }
    case 'remove_from_ticker': {
      const symbol = (tc.params.symbol as string) || '';
      if (symbol) {
        actions.removeFromTicker(symbol.toUpperCase());
        return `Removed ${symbol.toUpperCase()} from ticker tape`;
      }
      return 'Missing symbol';
    }
    case 'add_clock': {
      const city = (tc.params.city as string) || '';
      if (city) {
        const tz = resolveTimezone(city);
        if (tz) {
          actions.addClock(tz.label, tz.zone);
          return `Added ${tz.label} clock`;
        }
        return `Unknown city: ${city}. Try a major city name like "Tokyo", "London", "New York", etc.`;
      }
      return 'Missing city';
    }
    case 'remove_clock': {
      const city = (tc.params.city as string) || '';
      if (city) {
        const tz = resolveTimezone(city);
        if (tz) {
          actions.removeClock(tz.zone);
          return `Removed ${tz.label} clock`;
        }
        return `Unknown city: ${city}`;
      }
      return 'Missing city';
    }
    case 'switch_workspace': {
      const name = (tc.params.workspace as string) || '';
      if (name) {
        const ws = resolveWorkspace(name);
        if (ws) {
          actions.setActiveWorkspace(ws.id as Workspace);
          return `Switched to ${ws.label}`;
        }
        return `Unknown workspace: ${name}. Available: Markets, News, PA, Law, War Map`;
      }
      return 'Missing workspace name';
    }
    case 'create_alert': {
      const alertType = (tc.params.alert_type as string) || 'keyword';
      const name = (tc.params.name as string) || '';
      const keywords = (tc.params.keywords as string[]) || [];
      const symbol = (tc.params.symbol as string) || undefined;
      const priceCondition = (tc.params.price_condition as 'above' | 'below') || undefined;
      const priceTarget = tc.params.price_target as number | undefined;
      const nlQuery = (tc.params.natural_language_query as string) || undefined;

      if (alertType === 'keyword' && keywords.length === 0) return 'Missing keywords for keyword alert';
      if (alertType === 'price' && (!symbol || priceTarget === undefined)) return 'Missing symbol or price_target for price alert';

      return actions.createAlert({
        alert_type: alertType as 'keyword' | 'price',
        name: name || (alertType === 'keyword' ? keywords.slice(0, 3).join(', ') : `${symbol} ${priceCondition} $${priceTarget}`),
        keywords: alertType === 'keyword' ? keywords : undefined,
        symbol: alertType === 'price' ? symbol : undefined,
        price_condition: alertType === 'price' ? priceCondition : undefined,
        price_target: alertType === 'price' ? priceTarget : undefined,
        natural_language_query: nlQuery,
      });
    }
    case 'fetch_fmp_data':
      return '';
    default:
      return `Unknown tool: ${tc.tool}`;
  }
}

export function isClientToolCall(tc: ToolCall): boolean {
  return tc.tool !== 'fetch_fmp_data' && tc.tool !== 'tavily_search' && tc.tool !== 'web_search';
}

export function buildContextPayload(state: {
  selectedSymbol: string;
  chartTimeframe: string;
  chartType: string;
  indicators: { id: string; enabled: boolean }[];
  watchlist: { symbol: string; name: string }[];
  clocks: { label: string; zone: string }[];
  rightPanelView: string;
  leftTab: string;
  activeWatchlistName?: string;
  allWatchlists?: { name: string; symbolCount: number }[];
  customTickerSymbols?: string[];
}): Record<string, unknown> {
  return {
    currentSymbol: state.selectedSymbol,
    chartTimeframe: state.chartTimeframe,
    chartType: state.chartType,
    activeIndicators: state.indicators
      .filter(i => i.enabled)
      .map(i => i.id),
    watchlistSymbols: state.watchlist.map(w => w.symbol),
    activeWatchlistName: state.activeWatchlistName || null,
    allWatchlists: state.allWatchlists || [],
    clockZones: state.clocks.map(c => c.label),
    rightPanel: state.rightPanelView,
    leftTab: state.leftTab,
    customTickerSymbols: state.customTickerSymbols || [],
  };
}
