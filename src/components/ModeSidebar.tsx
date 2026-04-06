import { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import type { Workspace } from '../context/PlatformContext';

type Mode = 'markets' | 'news' | 'pa' | 'law' | 'flights' | 'chat' | 'mail' | 'alerts';

const WORKSPACE_MODES: Set<string> = new Set(['markets', 'news', 'pa', 'law', 'flights']);

const MODES: { key: Mode; label: string }[] = [
  { key: 'markets', label: 'Main' },
  { key: 'news', label: 'News' },
  { key: 'pa', label: 'PA' },
  { key: 'law', label: 'Law' },
  { key: 'flights', label: 'War Map' },
  { key: 'chat', label: 'Chat' },
  { key: 'mail', label: 'Mail' },
  { key: 'alerts', label: 'Alerts' },
];

function MarketsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function PAIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function LawIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M5 5h14" />
      <path d="M5 5l-3 6a3 3 0 0 0 6 0L5 5z" />
      <path d="M19 5l-3 6a3 3 0 0 0 6 0L19 5z" />
      <path d="M8 22h8" />
    </svg>
  );
}

function FlightsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MailIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4l-10 8L2 4" />
    </svg>
  );
}

function AlertsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const ICON_MAP: Record<Mode, (props: { active: boolean }) => JSX.Element> = {
  markets: MarketsIcon,
  news: NewsIcon,
  pa: PAIcon,
  law: LawIcon,
  flights: FlightsIcon,
  chat: ChatIcon,
  mail: MailIcon,
  alerts: AlertsIcon,
};

export default function ModeSidebar() {
  const [hoveredMode, setHoveredMode] = useState<Mode | null>(null);
  const platform = usePlatform();

  const handleModeClick = (mode: Mode) => {
    if (mode === 'chat') {
      platform.toggleChatSidebar();
    } else if (mode === 'alerts') {
      platform.toggleAlertsPanel();
    } else if (mode === 'mail') {
      // mail not yet implemented
    } else if (WORKSPACE_MODES.has(mode)) {
      platform.setActiveWorkspace(mode as Workspace);
    }
  };

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
        const isActive = m.key === 'chat' ? platform.chatSidebarOpen : m.key === 'alerts' ? platform.alertsPanelOpen : WORKSPACE_MODES.has(m.key) ? platform.activeWorkspace === m.key : false;
        const isHovered = hoveredMode === m.key;
        return (
          <>{m.key === 'chat' && (
            <div style={{ width: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
              <div style={{ height: 1, background: '#333' }} />
            </div>
          )}
          <button
            key={m.key}
            onClick={() => handleModeClick(m.key)}
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
              color: isActive ? '#ffffff' : isHovered ? '#ddd' : '#aaa',
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
          {m.key === 'mail' && (
            <div style={{ width: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
              <div style={{ height: 1, background: '#333' }} />
            </div>
          )}
          </>
        );
      })}
    </div>
  );
}
