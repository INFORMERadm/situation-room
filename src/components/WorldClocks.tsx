import { useState, useEffect, useRef } from 'react';

const TIMEZONE_OPTIONS: { label: string; zone: string }[] = [
  { label: 'New York', zone: 'America/New_York' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' },
  { label: 'Sydney', zone: 'Australia/Sydney' },
  { label: 'Dubai', zone: 'Asia/Dubai' },
  { label: 'Hong Kong', zone: 'Asia/Hong_Kong' },
  { label: 'Singapore', zone: 'Asia/Singapore' },
  { label: 'Shanghai', zone: 'Asia/Shanghai' },
  { label: 'Mumbai', zone: 'Asia/Kolkata' },
  { label: 'Frankfurt', zone: 'Europe/Berlin' },
  { label: 'Paris', zone: 'Europe/Paris' },
  { label: 'Zurich', zone: 'Europe/Zurich' },
  { label: 'Moscow', zone: 'Europe/Moscow' },
  { label: 'Sao Paulo', zone: 'America/Sao_Paulo' },
  { label: 'Chicago', zone: 'America/Chicago' },
  { label: 'Los Angeles', zone: 'America/Los_Angeles' },
  { label: 'Toronto', zone: 'America/Toronto' },
  { label: 'Seoul', zone: 'Asia/Seoul' },
  { label: 'Taipei', zone: 'Asia/Taipei' },
  { label: 'Jakarta', zone: 'Asia/Jakarta' },
  { label: 'Auckland', zone: 'Pacific/Auckland' },
  { label: 'Johannesburg', zone: 'Africa/Johannesburg' },
  { label: 'Cairo', zone: 'Africa/Cairo' },
  { label: 'Istanbul', zone: 'Europe/Istanbul' },
  { label: 'Riyadh', zone: 'Asia/Riyadh' },
];

const STORAGE_KEY = 'global-monitor-world-clocks';

const DEFAULT_CLOCKS = [
  { label: 'New York', zone: 'America/New_York' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' },
];

function loadClocks(): { label: string; zone: string }[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_CLOCKS;
}

function saveClocks(clocks: { label: string; zone: string }[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks));
}

function formatTime(zone: string): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getAbbreviation(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

interface Props {
  externalClocks?: { label: string; zone: string }[];
  onAddClock?: (label: string, zone: string) => void;
  onRemoveClock?: (zone: string) => void;
}

export default function WorldClocks({ externalClocks, onAddClock, onRemoveClock }: Props) {
  const [localClocks, setLocalClocks] = useState(loadClocks);
  const clocks = externalClocks || localClocks;
  const [times, setTimes] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tick = () => {
      const t: Record<string, string> = { UTC: new Date().toISOString().slice(11, 19) };
      clocks.forEach((c) => {
        t[c.zone] = formatTime(c.zone);
      });
      setTimes(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clocks]);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const addClock = (tz: { label: string; zone: string }) => {
    if (onAddClock) {
      onAddClock(tz.label, tz.zone);
    } else {
      const next = [...localClocks, tz];
      setLocalClocks(next);
      saveClocks(next);
    }
    setShowPicker(false);
    setSearch('');
  };

  const removeClock = (zone: string) => {
    if (onRemoveClock) {
      onRemoveClock(zone);
    } else {
      const next = localClocks.filter((c) => c.zone !== zone);
      setLocalClocks(next);
      saveClocks(next);
    }
  };

  const activeZones = new Set(clocks.map((c) => c.zone));
  const filtered = TIMEZONE_OPTIONS.filter(
    (tz) => !activeZones.has(tz.zone) && tz.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: '#1a1a1a',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          marginRight: 8,
        }}
      >
        <span style={{ color: '#777', marginRight: 2 }}>UTC</span>
        <span>{times['UTC'] || '--:--:--'}</span>
      </div>

      {clocks.map((c) => (
        <div
          key={c.zone}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '0 8px',
            borderLeft: '1px solid rgba(0,0,0,0.15)',
            fontSize: 11,
            letterSpacing: 0.5,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
            if (btn) btn.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
            if (btn) btn.style.opacity = '0';
          }}
        >
          <span style={{ color: '#777', marginRight: 2, fontSize: 10 }}>
            {c.label.toUpperCase()}
          </span>
          <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
            {times[c.zone] || '--:--:--'}
          </span>
          <span style={{ color: '#777', fontSize: 9, marginLeft: 2 }}>
            {getAbbreviation(c.zone)}
          </span>
          <button
            data-remove
            onClick={() => removeClock(c.zone)}
            style={{
              position: 'absolute',
              top: -6,
              right: -2,
              background: '#ff4757',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 14,
              height: 14,
              fontSize: 9,
              lineHeight: '14px',
              textAlign: 'center',
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.15s',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            x
          </button>
        </div>
      ))}

      <div style={{ position: 'relative', marginLeft: 4 }}>
        <button
          ref={buttonRef}
          onClick={() => setShowPicker(!showPicker)}
          style={{
            background: showPicker ? 'rgba(0,0,0,0.15)' : 'transparent',
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: 3,
            color: '#1a1a1a',
            width: 22,
            height: 22,
            fontSize: 14,
            lineHeight: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.5)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)';
            e.currentTarget.style.color = '#1a1a1a';
          }}
        >
          +
        </button>

        {showPicker && (
          <div
            ref={pickerRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: '#1a1a1a',
              border: '1px solid #292929',
              borderRadius: 4,
              width: 220,
              maxHeight: 280,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ padding: '6px 8px', borderBottom: '1px solid #292929' }}>
              <input
                autoFocus
                placeholder="Search timezone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '1px solid #292929',
                  borderRadius: 3,
                  color: '#c9d1d9',
                  padding: '4px 8px',
                  fontSize: 11,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px 8px', color: '#888', fontSize: 11, textAlign: 'center' }}>
                  No timezones available
                </div>
              ) : (
                filtered.map((tz) => (
                  <button
                    key={tz.zone}
                    onClick={() => addClock(tz)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '6px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #1e1e1e',
                      color: '#c9d1d9',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#222')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{tz.label}</span>
                    <span style={{ color: '#888', fontSize: 10 }}>
                      {formatTime(tz.zone)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
