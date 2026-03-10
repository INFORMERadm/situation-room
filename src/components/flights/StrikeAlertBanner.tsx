import { useState, useEffect, useRef } from 'react';
import type { StrikeEvent } from '../../types';
import { getWeaponProfile } from '../../lib/strikeConstants';

interface Props {
  events: StrikeEvent[];
  newEventIds: Set<string>;
  onClearNew: () => void;
}

function formatCountdown(event: StrikeEvent): string {
  const detectedAt = new Date(event.detected_at).getTime();
  const elapsed = (Date.now() - detectedAt) / 1000;
  const remaining = event.estimated_flight_time_seconds - elapsed;

  if (remaining <= 0) return 'IMPACT';
  if (remaining < 60) return `${Math.ceil(remaining)}s`;
  const min = Math.floor(remaining / 60);
  const sec = Math.ceil(remaining % 60);
  return `${min}m ${sec}s`;
}

function formatFlightTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export default function StrikeAlertBanner({ events, newEventIds, onClearNew }: Props) {
  const [, setTick] = useState(0);
  const timeoutRef = useRef<number>(0);

  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [events.length]);

  useEffect(() => {
    if (newEventIds.size > 0) {
      timeoutRef.current = window.setTimeout(onClearNew, 5000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [newEventIds, onClearNew]);

  if (events.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 200,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      maxWidth: 380,
      maxHeight: 'calc(100% - 120px)',
      overflowY: 'auto',
    }}>
      {events.map((event) => {
        const profile = getWeaponProfile(event.event_type);
        const isNew = newEventIds.has(event.id);
        const countdown = formatCountdown(event);
        const isImpact = countdown === 'IMPACT';

        return (
          <div
            key={event.id}
            style={{
              background: isNew
                ? 'rgba(255, 23, 68, 0.2)'
                : 'rgba(0, 0, 0, 0.88)',
              border: `1px solid ${isImpact ? '#ff1744' : isNew ? 'rgba(255, 23, 68, 0.6)' : '#333'}`,
              borderRadius: 8,
              padding: '8px 12px',
              backdropFilter: 'blur(8px)',
              animation: isNew ? 'strike-flash 0.6s ease-out' : undefined,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isImpact ? '#ff1744' : profile.color,
                boxShadow: `0 0 6px ${profile.color}`,
                animation: isImpact ? 'none' : 'strike-pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                color: profile.color,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {profile.label}
              </span>
              <span style={{
                color: isImpact ? '#ff1744' : '#ff9100',
                fontSize: 11,
                fontWeight: 700,
                marginLeft: 'auto',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isImpact ? 'IMPACT' : `ETA ${countdown}`}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#ddd',
              fontWeight: 600,
              marginBottom: 4,
            }}>
              <span>{event.source_label}</span>
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none" style={{ flexShrink: 0 }}>
                <path d="M0 4h12M8 0.5L12.5 4 8 7.5" stroke={profile.color} strokeWidth="1.5" />
              </svg>
              <span>{event.target_label}</span>
            </div>

            <div style={{
              display: 'flex',
              gap: 12,
              fontSize: 10,
              color: '#888',
            }}>
              <span>{event.projectile_count}x projectile{event.projectile_count > 1 ? 's' : ''}</span>
              {event.weapon_name && (
                <span style={{ color: '#aaa' }}>{event.weapon_name}</span>
              )}
              <span>~{formatFlightTime(event.estimated_flight_time_seconds)} flight</span>
            </div>

            {event.headline && (
              <div style={{
                fontSize: 9,
                color: '#666',
                marginTop: 4,
                borderTop: '1px solid #222',
                paddingTop: 4,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {event.headline}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes strike-flash {
          0% { background: rgba(255, 23, 68, 0.5); transform: scale(1.02); }
          100% { background: rgba(255, 23, 68, 0.2); transform: scale(1); }
        }
        @keyframes strike-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
