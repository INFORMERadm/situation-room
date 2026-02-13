import { useState } from 'react';

type Mode = 'markets' | 'news' | 'pa' | 'chat';

const MODES: { key: Mode; label: string }[] = [
  { key: 'markets', label: 'Markets' },
  { key: 'news', label: 'News' },
  { key: 'pa', label: 'PA' },
  { key: 'chat', label: 'Chat' },
];

function MarketsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff9800' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff9800' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function PAIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff9800' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff9800' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const ICON_MAP: Record<Mode, (props: { active: boolean }) => JSX.Element> = {
  markets: MarketsIcon,
  news: NewsIcon,
  pa: PAIcon,
  chat: ChatIcon,
};

export default function ModeSidebar() {
  const [activeMode, setActiveMode] = useState<Mode>('markets');
  const [hoveredMode, setHoveredMode] = useState<Mode | null>(null);

  return (
    <div style={{
      width: 48,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 12,
      gap: 4,
      background: '#0a0a0a',
      borderLeft: '1px solid #292929',
    }}>
      {MODES.map(m => {
        const Icon = ICON_MAP[m.key];
        const isActive = activeMode === m.key;
        const isHovered = hoveredMode === m.key;
        return (
          <>{m.key === 'chat' && (
            <div style={{ width: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
              <div style={{ height: 1, background: '#333' }} />
            </div>
          )}
          <button
            key={m.key}
            onClick={() => setActiveMode(m.key)}
            onMouseEnter={() => setHoveredMode(m.key)}
            onMouseLeave={() => setHoveredMode(null)}
            title={m.label}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: isActive ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderRadius: 6,
              color: isActive ? '#ff9800' : isHovered ? '#ccc' : '#888',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s',
            }}
          >
            <Icon active={isActive} />
            <span style={{
              fontSize: 7,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              lineHeight: 1,
              fontFamily: 'inherit',
            }}>
              {m.label}
            </span>
          </button>
          </>
        );
      })}
    </div>
  );
}
