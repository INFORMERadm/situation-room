interface ToolInfo {
  tool: string;
  label: string;
  icon: 'search' | 'data' | 'navigate' | 'chart' | 'list';
}

const TOOL_LABELS: Record<string, ToolInfo> = {
  tavily_search: { tool: 'tavily_search', label: 'Searching the web', icon: 'search' },
  fetch_fmp_data: { tool: 'fetch_fmp_data', label: 'Fetching financial data', icon: 'data' },
  change_symbol: { tool: 'change_symbol', label: 'Navigating to symbol', icon: 'navigate' },
  change_timeframe: { tool: 'change_timeframe', label: 'Changing timeframe', icon: 'chart' },
  change_chart_type: { tool: 'change_chart_type', label: 'Changing chart type', icon: 'chart' },
  toggle_indicator: { tool: 'toggle_indicator', label: 'Toggling indicator', icon: 'chart' },
  add_to_watchlist: { tool: 'add_to_watchlist', label: 'Adding to watchlist', icon: 'list' },
  remove_from_watchlist: { tool: 'remove_from_watchlist', label: 'Removing from watchlist', icon: 'list' },
  switch_right_panel: { tool: 'switch_right_panel', label: 'Switching panel', icon: 'navigate' },
  switch_left_tab: { tool: 'switch_left_tab', label: 'Switching tab', icon: 'navigate' },
};

function getToolDetail(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.tool === 'tavily_search') return parsed.params?.query || null;
    if (parsed.tool === 'fetch_fmp_data') {
      const ep = parsed.params?.endpoint || '';
      const sym = parsed.params?.params?.symbol || '';
      return sym ? `${ep} (${sym})` : ep;
    }
    if (parsed.tool === 'change_symbol') return parsed.params?.symbol || null;
    return null;
  } catch {
    return null;
  }
  return null;
}

export function extractToolCalls(streamContent: string): { name: string; detail: string | null }[] {
  const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  const calls: { name: string; detail: string | null }[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = regex.exec(streamContent)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const key = `${parsed.tool}:${JSON.stringify(parsed.params)}`;
      if (parsed.tool && !seen.has(key)) {
        seen.add(key);
        calls.push({ name: parsed.tool, detail: getToolDetail(match[1]) });
      }
    } catch { /* skip */ }
  }
  return calls;
}

function SpinnerIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'toolCallSpin 0.8s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4" opacity="0.3" />
      <path d="M12 18v4" opacity="0.7" />
      <path d="M4.93 4.93l2.83 2.83" opacity="0.2" />
      <path d="M16.24 16.24l2.83 2.83" opacity="0.6" />
      <path d="M2 12h4" opacity="0.1" />
      <path d="M18 12h4" opacity="0.5" />
      <path d="M4.93 19.07l2.83-2.83" opacity="0.8" />
      <path d="M16.24 7.76l2.83-2.83" opacity="0.4" />
    </svg>
  );
}

function ToolIcon({ type }: { type: string }) {
  const info = TOOL_LABELS[type];
  const icon = info?.icon || 'data';

  if (icon === 'search') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    );
  }
  if (icon === 'data') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb8c00" strokeWidth="2" style={{ flexShrink: 0 }}>
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    );
  }
  if (icon === 'navigate') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    );
  }
  if (icon === 'chart') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb8c00" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ flexShrink: 0 }}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function PulseDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#888',
            animation: `toolCallDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

interface Props {
  toolCalls: { name: string; detail: string | null }[];
}

export default function ToolCallIndicator({ toolCalls }: Props) {
  if (toolCalls.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '4px 16px 8px',
      animation: 'toolCallSlideIn 0.3s ease-out',
    }}>
      {toolCalls.map((tc, i) => {
        const info = TOOL_LABELS[tc.name];
        const label = info?.label || tc.name;
        const accentColor = tc.name === 'tavily_search' ? '#00bcd4' :
          tc.name === 'fetch_fmp_data' ? '#fb8c00' : '#00c853';

        return (
          <div
            key={`${tc.name}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}04, ${accentColor}08)`,
              border: `1px solid ${accentColor}25`,
              borderRadius: 8,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, transparent, ${accentColor}08, transparent)`,
              backgroundSize: '200% 100%',
              animation: 'toolCallShimmer 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />

            <SpinnerIcon />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <ToolIcon type={tc.name} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: accentColor,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}>
                  {label}
                  <PulseDots />
                </div>
                {tc.detail && (
                  <div style={{
                    color: '#777',
                    fontSize: 9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 280,
                  }}>
                    {tc.detail}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
