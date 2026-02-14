import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { EconomicEvent } from '../../types';

interface Props {
  events: EconomicEvent[];
}

type ImpactFilter = 'medium+' | 'all';

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

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4);
  const mMonth = monday.toLocaleDateString('en-US', { month: 'short' });
  const fMonth = friday.toLocaleDateString('en-US', { month: 'short' });
  const mDay = monday.getDate();
  const fDay = friday.getDate();
  if (mMonth === fMonth) {
    return `${mMonth} ${mDay} - ${fDay}`;
  }
  return `${mMonth} ${mDay} - ${fMonth} ${fDay}`;
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

const COUNTRY_FLAGS: Record<string, string> = {
  US: 'US', EU: 'EU', GB: 'GB', JP: 'JP',
  CH: 'CH', AU: 'AU', RU: 'RU', CN: 'CN',
  EA: 'EU', EMU: 'EU', UK: 'GB', EZ: 'EU',
};

function countryLabel(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] ?? code;
}

export default function EconomicCalendar({ events }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('medium+');
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const currentMonday = useMemo(() => getMonday(new Date()), []);
  const selectedMonday = useMemo(() => addDays(currentMonday, weekOffset * 7), [currentMonday, weekOffset]);
  const selectedFriday = useMemo(() => addDays(selectedMonday, 4), [selectedMonday]);

  const isThisWeek = weekOffset === 0;
  const isNextWeek = weekOffset === 1;

  const weekLabel = useMemo(() => {
    if (isThisWeek) return 'This Week';
    if (isNextWeek) return 'Next Week';
    return formatWeekRange(selectedMonday);
  }, [isThisWeek, isNextWeek, selectedMonday]);

  const filteredEvents = useMemo(() => {
    const startStr = selectedMonday.toISOString().slice(0, 10);
    const endDate = addDays(selectedFriday, 1);
    const endStr = endDate.toISOString().slice(0, 10);

    return events.filter((e) => {
      const dateStr = e.date.slice(0, 10);
      if (dateStr < startStr || dateStr >= endStr) return false;
      if (impactFilter === 'medium+') {
        const imp = e.impact.toLowerCase();
        if (imp !== 'high' && imp !== 'medium') return false;
      }
      return true;
    });
  }, [events, selectedMonday, selectedFriday, impactFilter]);

  const grouped = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));
    const groups: { label: string; dateStr: string; events: EconomicEvent[] }[] = [];
    let currentDay = '';

    for (const ev of sorted) {
      const day = ev.date.slice(0, 10);
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ label: formatDayLabel(ev.date), dateStr: day, events: [] });
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [filteredEvents]);

  const scrollToToday = useCallback(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (isThisWeek && grouped.length > 0) {
      requestAnimationFrame(() => {
        scrollToToday();
      });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [weekOffset, impactFilter, grouped.length, isThisWeek, scrollToToday]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px solid #292929',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
      }}>
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={weekOffset <= 0}
          style={{
            background: 'none',
            border: 'none',
            color: weekOffset <= 0 ? '#444' : '#aaa',
            cursor: weekOffset <= 0 ? 'default' : 'pointer',
            fontSize: 14,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          &#9664;
        </button>
        <span style={{
          color: '#ccc',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {weekLabel}
          <span style={{ color: '#666', fontWeight: 400, marginLeft: 6 }}>
            {formatWeekRange(selectedMonday)}
          </span>
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={weekOffset >= 1}
          style={{
            background: 'none',
            border: 'none',
            color: weekOffset >= 1 ? '#444' : '#aaa',
            cursor: weekOffset >= 1 ? 'default' : 'pointer',
            fontSize: 14,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          &#9654;
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #292929',
      }}>
        {(['medium+', 'all'] as ImpactFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setImpactFilter(f)}
            style={{
              flex: 1,
              background: impactFilter === f ? '#292929' : 'transparent',
              border: 'none',
              borderBottom: impactFilter === f ? '1px solid #ff9800' : '1px solid transparent',
              color: impactFilter === f ? '#e0e0e0' : '#666',
              fontSize: 9,
              fontWeight: 600,
              padding: '5px 0',
              cursor: 'pointer',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}
          >
            {f === 'medium+' ? 'Med / High' : 'All'}
          </button>
        ))}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {events.length === 0 && (
          <div style={{ padding: 16, color: '#888', fontSize: 11 }}>Loading...</div>
        )}
        {events.length > 0 && filteredEvents.length === 0 && (
          <div style={{ padding: 16, color: '#666', fontSize: 11, textAlign: 'center' }}>
            No {impactFilter === 'medium+' ? 'medium/high impact' : ''} events this week
          </div>
        )}
        {grouped.map((group) => {
          const isToday = group.dateStr === todayStr;
          return (
            <div
              key={group.dateStr}
              ref={isToday ? todayRef : undefined}
            >
              <div style={{
                padding: '6px 12px',
                background: isToday ? '#1c1600' : '#1a1a1a',
                borderBottom: '1px solid #292929',
                borderLeft: isToday ? '2px solid #ff9800' : '2px solid transparent',
                color: isToday ? '#ff9800' : '#aaa',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.5,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}>
                {group.label}
                <span style={{ color: '#555', marginLeft: 8, fontWeight: 400 }}>
                  {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                </span>
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
                    <span style={{
                      color: '#777',
                      fontSize: 8,
                      fontWeight: 600,
                      background: '#222',
                      padding: '1px 4px',
                      borderRadius: 2,
                      letterSpacing: 0.5,
                    }}>
                      {countryLabel(e.country)}
                    </span>
                    <span style={{
                      color: impactColor(e.impact),
                      fontSize: 8,
                      opacity: 0.7,
                      marginLeft: 'auto',
                    }}>
                      {e.impact}
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
          );
        })}
      </div>
    </div>
  );
}
