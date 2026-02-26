interface ToolInfo {
  tool: string;
  label: string;
  icon: 'search' | 'data' | 'navigate' | 'chart' | 'list' | 'mcp';
  color: string;
  isMcp?: boolean;
  mcpServer?: string;
}

const MCP_COLOR = '#22c55e';
const MCP_BORDER = '#16a34a';

const TOOL_LABELS: Record<string, ToolInfo> = {
  tavily_search: { tool: 'tavily_search', label: 'Searching the web', icon: 'search', color: '#00bcd4' },
  fetch_fmp_data: { tool: 'fetch_fmp_data', label: 'Fetching financial data', icon: 'data', color: '#fb8c00' },
  change_symbol: { tool: 'change_symbol', label: 'Navigating to symbol', icon: 'navigate', color: '#00c853' },
  change_timeframe: { tool: 'change_timeframe', label: 'Changing timeframe', icon: 'chart', color: '#fb8c00' },
  change_chart_type: { tool: 'change_chart_type', label: 'Changing chart type', icon: 'chart', color: '#fb8c00' },
  toggle_indicator: { tool: 'toggle_indicator', label: 'Toggling indicator', icon: 'chart', color: '#fb8c00' },
  add_to_watchlist: { tool: 'add_to_watchlist', label: 'Adding to watchlist', icon: 'list', color: '#aaa' },
  remove_from_watchlist: { tool: 'remove_from_watchlist', label: 'Removing from watchlist', icon: 'list', color: '#aaa' },
  switch_right_panel: { tool: 'switch_right_panel', label: 'Switching panel', icon: 'navigate', color: '#00c853' },
  switch_left_tab: { tool: 'switch_left_tab', label: 'Switching tab', icon: 'navigate', color: '#00c853' },
};

function getToolInfo(name: string): ToolInfo {
  if (name.startsWith('customgpt_')) {
    const rawTool = name.replace(/^customgpt_/, '');
    const label = rawTool === 'search' || rawTool === 'ask'
      ? 'Querying knowledge base'
      : `Running ${rawTool.replace(/_/g, ' ')}`;
    return {
      tool: name,
      label,
      icon: 'mcp',
      color: MCP_COLOR,
      isMcp: true,
      mcpServer: 'CustomGPT MCP',
    };
  }
  if (name.startsWith('smithery_')) {
    const withoutPrefix = name.replace(/^smithery_/, '');
    const lastUnderscore = withoutPrefix.lastIndexOf('_');
    const serverPart = lastUnderscore > 0 ? withoutPrefix.substring(0, lastUnderscore) : withoutPrefix;
    const toolPart = lastUnderscore > 0 ? withoutPrefix.substring(lastUnderscore + 1) : withoutPrefix;
    const displayServer = serverPart.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      tool: name,
      label: `Running ${toolPart.replace(/_/g, ' ')}`,
      icon: 'mcp',
      color: MCP_COLOR,
      isMcp: true,
      mcpServer: displayServer,
    };
  }
  return TOOL_LABELS[name] ?? { tool: name, label: name, icon: 'data', color: '#aaa' };
}

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
    if (parsed.tool?.startsWith('customgpt_')) {
      return parsed.params?.query || parsed.params?.question || null;
    }
    if (parsed.tool?.startsWith('smithery_')) {
      return parsed.params?.query || parsed.params?.search || parsed.params?.name || null;
    }
    return null;
  } catch {
    return null;
  }
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

function SpinnerIcon({ color }: { color: string }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2.5"
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

function McpServerIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="20" height="5" rx="1.5" />
      <rect x="2" y="10" width="20" height="5" rx="1.5" />
      <rect x="2" y="17" width="20" height="5" rx="1.5" />
      <circle cx="18" cy="5.5" r="1" fill={color} stroke="none" />
      <circle cx="18" cy="12.5" r="1" fill={color} stroke="none" />
      <circle cx="18" cy="19.5" r="1" fill={color} stroke="none" />
    </svg>
  );
}

function ToolIcon({ info }: { info: ToolInfo }) {
  if (info.icon === 'mcp') {
    return <McpServerIcon color={info.color} />;
  }
  if (info.icon === 'search') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    );
  }
  if (info.icon === 'data') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" style={{ flexShrink: 0 }}>
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    );
  }
  if (info.icon === 'navigate') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" style={{ flexShrink: 0 }}>
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    );
  }
  if (info.icon === 'chart') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" style={{ flexShrink: 0 }}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function PulseDots({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            opacity: 0.6,
            animation: `toolCallDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function McpOrbitRing({ color }: { color: string }) {
  return (
    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
      <svg
        width="28" height="28" viewBox="0 0 28 28"
        style={{ position: 'absolute', top: 0, left: 0, animation: 'mcpOrbit 2s linear infinite' }}
      >
        <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="18 52" strokeLinecap="round" opacity="0.5" />
      </svg>
      <svg
        width="28" height="28" viewBox="0 0 28 28"
        style={{ position: 'absolute', top: 0, left: 0, animation: 'mcpOrbit 1.3s linear infinite reverse' }}
      >
        <circle cx="14" cy="14" r="7" fill="none" stroke={color} strokeWidth="1" strokeDasharray="10 35" strokeLinecap="round" opacity="0.35" />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        opacity: 0.9,
        boxShadow: `0 0 8px ${color}80`,
        animation: 'mcpCorePulse 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

function McpToolCallCard({
  info,
  detail,
  index,
}: {
  info: ToolInfo;
  detail: string | null;
  index: number;
}) {
  const color = info.color;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: `linear-gradient(135deg, ${color}0f, ${color}06, ${color}0f)`,
        border: `1px solid ${MCP_BORDER}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
        animation: `mcpCardSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.08}s both`,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(90deg, transparent, ${color}0a, transparent)`,
        backgroundSize: '300% 100%',
        animation: 'mcpShimmer 2.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <McpOrbitRing color={color} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            background: `${color}20`,
            border: `1px solid ${color}40`,
            borderRadius: 3,
            color,
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 5px',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            MCP
          </span>
          <span style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 3,
            color: '#888',
            fontSize: 8,
            padding: '1px 5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {info.mcpServer ?? 'MCP Server'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            color,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}>
            {info.label}
          </span>
          <PulseDots color={color} />
        </div>
        {detail && (
          <div style={{
            color: '#666',
            fontSize: 9,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 300,
          }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}

function RegularToolCard({
  info,
  detail,
  index,
}: {
  info: ToolInfo;
  detail: string | null;
  index: number;
}) {
  const color = info.color;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: `linear-gradient(135deg, ${color}08, ${color}04, ${color}08)`,
        border: `1px solid ${color}25`,
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
        animation: `toolCallSlideIn 0.3s ease-out ${index * 0.06}s both`,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(90deg, transparent, ${color}08, transparent)`,
        backgroundSize: '200% 100%',
        animation: 'toolCallShimmer 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <SpinnerIcon color={color} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <ToolIcon info={info} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}>
            {info.label}
            <PulseDots color={color} />
          </div>
          {detail && (
            <div style={{
              color: '#777',
              fontSize: 9,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 280,
            }}>
              {detail}
            </div>
          )}
        </div>
      </div>
    </div>
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
    }}>
      {toolCalls.map((tc, i) => {
        const info = getToolInfo(tc.name);
        if (info.isMcp) {
          return (
            <McpToolCallCard key={`${tc.name}-${i}`} info={info} detail={tc.detail} index={i} />
          );
        }
        return (
          <RegularToolCard key={`${tc.name}-${i}`} info={info} detail={tc.detail} index={i} />
        );
      })}
    </div>
  );
}
