import WorldClocks from './WorldClocks';
import UserMenu from './UserMenu';

interface Props {
  externalClocks?: { label: string; zone: string }[];
  onAddClock?: (label: string, zone: string) => void;
  onRemoveClock?: (zone: string) => void;
  onMCPSettings?: () => void;
  mcpCount?: number;
}

export default function Header({ externalClocks, onAddClock, onRemoveClock, onMCPSettings, mcpCount }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: 'none',
        padding: '6px 0 6px 16px',
        minHeight: 54,
        background: '#000',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
          <path d="M4.5 6.5h15" />
          <path d="M4.5 17.5h15" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 3, color: '#fff' }}>N4-AI</span>
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginLeft: 12,
          position: 'relative',
          top: 4,
        }}>Professional Version</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WorldClocks
          externalClocks={externalClocks}
          onAddClock={onAddClock}
          onRemoveClock={onRemoveClock}
        />
        {onMCPSettings && (
          <button
            onClick={onMCPSettings}
            title="MCP Connections"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 5,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            MCP
            {(mcpCount ?? 0) > 0 && (
              <span style={{
                background: '#fff',
                color: '#000',
                borderRadius: 8,
                padding: '0 5px',
                fontSize: 9,
                fontWeight: 800,
                lineHeight: '14px',
              }}>
                {mcpCount}
              </span>
            )}
          </button>
        )}
        <div style={{ position: 'relative', right: -12 }}>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
