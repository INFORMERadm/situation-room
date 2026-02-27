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
  };
}
