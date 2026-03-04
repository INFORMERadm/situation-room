import { useRef, useEffect } from 'react';
import type { LiveFlight } from '../../types';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  results: LiveFlight[];
  onSelect: (flightId: string) => void;
  onClose: () => void;
}

export default function FlightSearchBar({ query, onQueryChange, results, onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div style={{
      borderBottom: '1px solid #292929', background: '#0d0d0d',
      flexShrink: 0, maxHeight: 300, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search by callsign, flight number, airline, airport..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#888',
            cursor: 'pointer', fontSize: 14, padding: '0 4px',
          }}
        >
          x
        </button>
      </div>

      {query.trim() && (
        <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          {results.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#666', fontSize: 11 }}>
              No flights found matching "{query}"
            </div>
          ) : (
            results.map(f => (
              <button
                key={f.flightId}
                onClick={() => onSelect(f.flightId)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', background: 'transparent', border: 'none',
                  borderBottom: '1px solid #1a1a1a', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a1a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8" style={{ flexShrink: 0, transform: `rotate(${f.heading}deg)` }}>
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {f.callsign} {f.flightNumber && f.flightNumber !== f.callsign ? `(${f.flightNumber})` : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#888' }}>
                    {f.airline || 'Unknown'} {f.origin && f.destination ? `| ${f.origin} -> ${f.destination}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#666', textAlign: 'right', flexShrink: 0 }}>
                  {f.altitude > 0 ? `FL${Math.round(f.altitude * 3.281 / 100)}` : 'GND'}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
