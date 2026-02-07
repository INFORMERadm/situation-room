import type { EconomicEvent } from '../../types';

interface Props {
  events: EconomicEvent[];
}

function impactColor(impact: string): string {
  switch (impact.toLowerCase()) {
    case 'high': return '#ff1744';
    case 'medium': return '#ff9800';
    case 'low': return '#00c853';
    default: return '#555';
  }
}

function fmtVal(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return n.toFixed(2);
}

export default function EconomicCalendar({ events }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
        color: '#888',
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        Economic Calendar
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {events.length === 0 && (
          <div style={{ padding: 16, color: '#555', fontSize: 11 }}>Loading...</div>
        )}
        {events.map((e, i) => (
          <div
            key={`${e.event}-${i}`}
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid #1e1e1e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: impactColor(e.impact),
                flexShrink: 0,
              }} />
              <span style={{ color: '#888', fontSize: 9 }}>
                {e.date.slice(5, 16)}
              </span>
              <span style={{ color: '#555', fontSize: 9 }}>
                {e.country}
              </span>
            </div>
            <div style={{
              color: '#ccc',
              fontSize: 11,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 2,
            }}>
              {e.event}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: '#555', fontSize: 9 }}>
                Prev: <span style={{ color: '#888' }}>{fmtVal(e.previous)}</span>
              </span>
              <span style={{ color: '#555', fontSize: 9 }}>
                Est: <span style={{ color: '#888' }}>{fmtVal(e.estimate)}</span>
              </span>
              <span style={{ color: '#555', fontSize: 9 }}>
                Act: <span style={{ color: e.actual !== null ? '#e0e0e0' : '#888' }}>
                  {fmtVal(e.actual)}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
