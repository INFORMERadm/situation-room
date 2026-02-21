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
        padding: '6px 16px',
        minHeight: 34,
        background: '#fb8c00',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#1a1a1a',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <img
          src="/Black_Transparent.png"
          alt="N4 Logo"
          style={{ width: 28, height: 28, objectFit: 'contain' }}
        />
        <span style={{ position: 'relative', top: 1 }}>N4-AI Agentic Information Platform</span>
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
              background: 'rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 5,
              cursor: 'pointer',
              color: '#1a1a1a',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            MCP
            {(mcpCount ?? 0) > 0 && (
              <span style={{
                background: '#1a1a1a',
                color: '#fb8c00',
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
        <UserMenu />
      </div>
    </div>
  );
}
