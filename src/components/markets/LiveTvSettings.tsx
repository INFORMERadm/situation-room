import { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LIVE_TV_CHANNELS } from '../../lib/liveTvChannels';

interface Props {
  channelOrder: string[];
  hiddenChannels: string[];
  onReorder: (order: string[]) => void;
  onToggleVisibility: (channelId: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const channelMap = new Map(LIVE_TV_CHANNELS.map(c => [c.id, c]));

export default function LiveTvSettings({ channelOrder, hiddenChannels, onReorder, onToggleVisibility, onReset, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  const ordered = channelOrder.length > 0
    ? channelOrder.map(id => channelMap.get(id)).filter(Boolean) as typeof LIVE_TV_CHANNELS
    : LIVE_TV_CHANNELS;

  for (const ch of LIVE_TV_CHANNELS) {
    if (!channelOrder.includes(ch.id)) {
      (ordered as typeof LIVE_TV_CHANNELS).push(ch);
    }
  }

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const move = useCallback((id: string, dir: -1 | 1) => {
    const ids = ordered.map(c => c.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next);
  }, [ordered, onReorder]);

  const content = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 280,
        height: '100vh',
        background: '#111',
        borderLeft: '1px solid #292929',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        animation: 'aiFadeIn 0.12s ease-out',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Channel Settings</span>
        <button onClick={onClose} style={closeBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {ordered.map((ch, idx) => {
          const hidden = hiddenChannels.includes(ch.id);
          return (
            <div
              key={ch.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                opacity: hidden ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button
                  onClick={() => move(ch.id, -1)}
                  disabled={idx === 0}
                  style={arrowBtnStyle(idx === 0)}
                  title="Move up"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={() => move(ch.id, 1)}
                  disabled={idx === ordered.length - 1}
                  style={arrowBtnStyle(idx === ordered.length - 1)}
                  title="Move down"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: hidden ? '#555' : '#ccc', letterSpacing: '0.3px' }}>
                {ch.label}
              </span>

              <button
                onClick={() => onToggleVisibility(ch.id)}
                title={hidden ? 'Show channel' : 'Hide channel'}
                style={{ ...closeBtnStyle, color: hidden ? '#555' : '#999' }}
              >
                {hidden ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #292929' }}>
        <button onClick={() => { onReset(); onClose(); }} style={resetBtnStyle}>
          Reset to defaults
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#999',
  display: 'flex',
  alignItems: 'center',
  padding: 4,
  borderRadius: 4,
  transition: 'color 0.15s',
};

const arrowBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: 'none',
  cursor: disabled ? 'default' : 'pointer',
  color: disabled ? '#333' : '#888',
  display: 'flex',
  alignItems: 'center',
  padding: 1,
  transition: 'color 0.15s',
});

const resetBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'transparent',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#999',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};
