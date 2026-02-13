import { useState, useRef, useEffect } from 'react';
import type { IndicatorConfig } from '../../lib/indicators';
import { CATEGORY_LABELS } from '../../lib/indicators';

interface Props {
  indicators: IndicatorConfig[];
  onToggle: (id: string) => void;
}

export default function IndicatorMenu({ indicators, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = indicators.filter(i => i.enabled).length;

  const categories = ['moving_avg', 'bands', 'volume', 'oscillator'] as const;
  const grouped = categories
    .map(cat => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      items: indicators.filter(i => i.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          background: open ? '#292929' : 'transparent',
          border: '1px solid',
          borderColor: activeCount > 0 ? '#00c853' : '#292929',
          color: activeCount > 0 ? '#00c853' : '#999',
          padding: '3px 8px',
          fontSize: 10,
          cursor: 'pointer',
          fontFamily: 'inherit',
          borderRadius: 2,
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 4h14M4 1v6M1 10h14M11 7v6" />
        </svg>
        Indicators
        {activeCount > 0 && (
          <span style={{
            background: '#00c853',
            color: '#000',
            borderRadius: 6,
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 4px',
            lineHeight: '12px',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: '#1a1a1a',
          border: '1px solid #292929',
          borderRadius: 4,
          width: 200,
          zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 10px 4px',
            fontSize: 10,
            color: '#aaa',
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            borderBottom: '1px solid #292929',
          }}>
            Technical Indicators
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {grouped.map(group => (
              <div key={group.key}>
                <div style={{
                  padding: '6px 10px 2px',
                  fontSize: 9,
                  color: '#999',
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>
                  {group.label}
                </div>
                {group.items.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => onToggle(ind.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '5px 10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      color: ind.enabled ? '#e0e0e0' : '#999',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#292929')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${ind.enabled ? ind.color : '#666'}`,
                      background: ind.enabled ? ind.color + '22' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                      {ind.enabled && (
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke={ind.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: ind.color,
                      flexShrink: 0,
                      opacity: ind.enabled ? 1 : 0.3,
                    }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{ind.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
