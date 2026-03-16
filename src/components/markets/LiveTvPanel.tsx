import { useState, useMemo, useRef, useEffect } from 'react';
import { LIVE_TV_CHANNELS, buildEmbedUrl } from '../../lib/liveTvChannels';
import { useLiveTvSettings } from '../../hooks/useLiveTvSettings';
import LiveTvSettings from './LiveTvSettings';

interface Props {
  userId: string | undefined;
}

export default function LiveTvPanel({ userId }: Props) {
  const tv = useLiveTvSettings(userId);
  const [showSettings, setShowSettings] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const channelMap = useMemo(() => {
    const m = new Map<string, (typeof LIVE_TV_CHANNELS)[number]>();
    for (const ch of LIVE_TV_CHANNELS) m.set(ch.id, ch);
    return m;
  }, []);

  const visibleChannels = useMemo(() => {
    const ordered = tv.channelOrder
      .filter(id => !tv.hiddenChannels.includes(id))
      .map(id => channelMap.get(id))
      .filter(Boolean) as (typeof LIVE_TV_CHANNELS)[number][];
    for (const ch of LIVE_TV_CHANNELS) {
      if (!tv.channelOrder.includes(ch.id) && !tv.hiddenChannels.includes(ch.id)) {
        ordered.push(ch);
      }
    }
    return ordered;
  }, [tv.channelOrder, tv.hiddenChannels, channelMap]);

  const activeChannel = channelMap.get(tv.selectedChannel) || LIVE_TV_CHANNELS[0];
  const embedUrl = buildEmbedUrl(activeChannel, tv.muted);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [dropdownOpen]);

  return (
    <div style={{ borderBottom: '1px solid #292929', background: '#000' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={liveDotStyle} />
          <span style={titleStyle}>LIVE</span>
        </div>

        <div style={{ position: 'relative', flex: 1, margin: '0 8px' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            style={channelSelectStyle}
          >
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeChannel.label}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {dropdownOpen && (
            <div style={dropdownMenuStyle}>
              {visibleChannels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { tv.selectChannel(ch.id); setDropdownOpen(false); }}
                  style={dropdownItemStyle(ch.id === tv.selectedChannel)}
                  onMouseEnter={e => { if (ch.id !== tv.selectedChannel) e.currentTarget.style.background = '#1a1a1a'; }}
                  onMouseLeave={e => { if (ch.id !== tv.selectedChannel) e.currentTarget.style.background = 'transparent'; }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={tv.toggleMute} title={tv.muted ? 'Unmute' : 'Mute'} style={{ ...iconBtnStyle, color: tv.muted ? '#666' : '#00c853' }}>
            {tv.muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowSettings(prev => !prev)}
            title="Channel settings"
            style={{ ...iconBtnStyle, color: showSettings ? '#fff' : '#666' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        {showSettings && (
          <LiveTvSettings
            channelOrder={tv.channelOrder}
            hiddenChannels={tv.hiddenChannels}
            onReorder={tv.setChannelOrder}
            onToggleVisibility={tv.toggleChannelVisibility}
            onReset={tv.resetToDefaults}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>

      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
        <iframe
          key={`${activeChannel.id}-${tv.muted}`}
          src={embedUrl}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={`${activeChannel.label} Live Stream`}
        />
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: '#0a0a0a',
  borderBottom: '1px solid #292929',
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  position: 'relative',
  zIndex: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '1px',
  color: '#fff',
  fontFamily: "'Courier New', Courier, monospace",
};

const liveDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: '#e53935',
  boxShadow: '0 0 6px 2px rgba(229,57,53,0.5)',
  animation: 'livePulse 1.5s ease-in-out infinite',
  flexShrink: 0,
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
  borderRadius: 4,
  transition: 'color 0.15s',
};

const channelSelectStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  padding: '4px 8px',
  background: '#111',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#ffffff',
  fontSize: '9.5px',
  fontWeight: 700,
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 2,
  background: '#111',
  border: '1px solid #333',
  borderRadius: 4,
  padding: '2px 0',
  zIndex: 9999,
  maxHeight: 240,
  overflowY: 'auto',
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  animation: 'aiFadeIn 0.1s ease-out',
};

const dropdownItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  padding: '6px 10px',
  background: active ? 'rgba(250,238,30,0.12)' : 'transparent',
  border: 'none',
  color: active ? '#ffffff' : '#aaa',
  fontSize: '9.5px',
  fontWeight: active ? 700 : 600,
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 0.1s',
});
