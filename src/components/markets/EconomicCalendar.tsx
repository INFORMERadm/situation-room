import { useMemo } from 'react';
import type { EconomicEvent } from '../../types';

interface Props {
  events: EconomicEvent[];
}

function impactColor(impact: string): string {
  switch (impact.toLowerCase()) {
    case 'high': return '#ff1744';
    case 'medium': return '#ff9800';
    case 'low': return '#00c853';
    default: return '#888';
  }
}

function fmtVal(n: number | null): string {
  if (n === null || n === undefined) return '-';
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return n.toFixed(2);
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
  const dayStr = dateStr.slice(0, 10);

  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = d.getDate();

  if (dayStr === todayStr) return `Today - ${weekday}, ${month} ${dayNum}`;
  if (dayStr === tomorrowStr) return `Tomorrow - ${weekday}, ${month} ${dayNum}`;
  return `${weekday}, ${month} ${dayNum}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function EconomicCalendar({ events }: Props) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const groups: { label: string; events: EconomicEvent[] }[] = [];
    let currentDay = '';

    for (const ev of sorted) {
      const day = ev.date.slice(0, 10);
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ label: formatDayLabel(ev.date), events: [] });
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [events]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
        color: '#aaa',
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        Economic Calendar
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {events.length === 0 && (
          <div style={{ padding: 16, color: '#888', fontSize: 11 }}>Loading...</div>
        )}
        {grouped.map((group) => (
          <div key={group.label}>
            <div style={{
              padding: '6px 12px',
              background: '#1a1a1a',
              borderBottom: '1px solid #292929',
              color: group.label.startsWith('Today') ? '#ff9800' : '#aaa',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}>
              {group.label}
            </div>
            {group.events.map((e, i) => (
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
                  <span style={{ color: '#aaa', fontSize: 9 }}>
                    {formatTime(e.date)}
                  </span>
                  <span style={{ color: '#888', fontSize: 9 }}>
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
                  <span style={{ color: '#888', fontSize: 9 }}>
                    Prev: <span style={{ color: '#aaa' }}>{fmtVal(e.previous)}</span>
                  </span>
                  <span style={{ color: '#888', fontSize: 9 }}>
                    Est: <span style={{ color: '#aaa' }}>{fmtVal(e.estimate)}</span>
                  </span>
                  <span style={{ color: '#888', fontSize: 9 }}>
                    Act: <span style={{ color: e.actual !== null ? '#e0e0e0' : '#aaa' }}>
                      {fmtVal(e.actual)}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
