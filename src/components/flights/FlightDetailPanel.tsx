import type { FlightDetail } from '../../types';

interface Props {
  flight: FlightDetail;
  loading: boolean;
  onClose: () => void;
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: '#141414', borderRadius: 6,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: color || '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: '#888' }}>{unit}</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ color: '#666', fontSize: 11 }}>{label}</span>
      <span style={{ color: '#ddd', fontSize: 11, fontWeight: 500, textAlign: 'right', maxWidth: '65%', fontVariantNumeric: 'tabular-nums' }}>
        {value || '--'}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1,
      fontWeight: 700, marginTop: 16, marginBottom: 6, paddingBottom: 4,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {title}
    </div>
  );
}

export default function FlightDetailPanel({ flight, loading, onClose }: Props) {
  if (loading) {
    return (
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 360, height: '100%',
        background: '#0d0d0d', borderLeft: '1px solid #222', zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, border: '2px solid #333', borderTopColor: '#ff9800',
          borderRadius: '50%', animation: 'detail-spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#888', fontSize: 12 }}>Loading flight data...</span>
        <style>{`@keyframes detail-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const altitudeFt = Math.round(flight.altitude * 3.281);
  const speedKnots = Math.round(flight.speed * 1.944);
  const speedKmh = Math.round(flight.speed * 3.6);
  const vspeedFpm = Math.round(flight.verticalSpeed * 196.85);

  let statusColor = '#38bdf8';
  let statusLabel = 'En Route';
  if (flight.onGround || flight.altitude < 50) {
    statusColor = '#facc15';
    statusLabel = 'On Ground';
  } else if (flight.verticalSpeed > 2) {
    statusColor = '#4ade80';
    statusLabel = 'Climbing';
  } else if (flight.verticalSpeed < -2) {
    statusColor = '#f97316';
    statusLabel = 'Descending';
  }

  const headingDir = (() => {
    const h = flight.heading;
    if (h >= 337.5 || h < 22.5) return 'N';
    if (h < 67.5) return 'NE';
    if (h < 112.5) return 'E';
    if (h < 157.5) return 'SE';
    if (h < 202.5) return 'S';
    if (h < 247.5) return 'SW';
    if (h < 292.5) return 'W';
    return 'NW';
  })();

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 360, height: '100%',
      background: '#0d0d0d', borderLeft: '1px solid #222', zIndex: 1001,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #222', flexShrink: 0,
        background: 'linear-gradient(180deg, #141414 0%, #0d0d0d 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                {flight.callsign || flight.flightNumber || 'UNKNOWN'}
              </span>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 8px',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                <span style={{ fontSize: 9, color: statusColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {statusLabel}
                </span>
              </div>
            </div>
            {flight.airline && (
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{flight.airline}</div>
            )}
            {flight.flightNumber && flight.flightNumber !== flight.callsign && (
              <div style={{ fontSize: 10, color: '#666' }}>Flight {flight.flightNumber}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
              color: '#888', cursor: 'pointer', width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.15s ease', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#888'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {(flight.origin || flight.destination) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
            padding: '10px 12px', background: '#141414', borderRadius: 8,
          }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                {flight.origin || '---'}
              </div>
              {flight.originName && (
                <div style={{ fontSize: 9, color: '#888', marginTop: 2, lineHeight: 1.3 }}>
                  {flight.originName}
                </div>
              )}
              {(flight.originCity || flight.originCountry) && (
                <div style={{ fontSize: 9, color: '#555' }}>
                  {[flight.originCity, flight.originCountry].filter(Boolean).join(', ')}
                </div>
              )}
              {flight.departureTime && (
                <div style={{ fontSize: 10, color: '#ff9800', marginTop: 3, fontWeight: 600 }}>
                  {new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 20, height: 1, background: '#333' }} />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff9800" style={{ transform: 'rotate(90deg)' }}>
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div style={{ width: 20, height: 1, background: '#333' }} />
              </div>
              {flight.distanceKm > 0 && (
                <div style={{ fontSize: 9, color: '#555', marginTop: 3 }}>{flight.distanceKm.toLocaleString()} km</div>
              )}
            </div>

            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                {flight.destination || '---'}
              </div>
              {flight.destinationName && (
                <div style={{ fontSize: 9, color: '#888', marginTop: 2, lineHeight: 1.3 }}>
                  {flight.destinationName}
                </div>
              )}
              {(flight.destinationCity || flight.destinationCountry) && (
                <div style={{ fontSize: 9, color: '#555' }}>
                  {[flight.destinationCity, flight.destinationCountry].filter(Boolean).join(', ')}
                </div>
              )}
              {flight.arrivalTime && (
                <div style={{ fontSize: 10, color: '#ff9800', marginTop: 3, fontWeight: 600 }}>
                  {new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        )}

        {flight.progressPct > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: '#666' }}>PROGRESS</span>
              <span style={{ fontSize: 9, color: '#ff9800', fontWeight: 700 }}>{flight.progressPct}%</span>
            </div>
            <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${flight.progressPct}%`,
                background: 'linear-gradient(90deg, #ff9800, #ffb74d)', borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <SectionHeader title="Live Telemetry" />
        <div style={{ display: 'flex', gap: 6 }}>
          <StatCard
            label="Altitude"
            value={altitudeFt > 100 ? `FL${Math.round(altitudeFt / 100)}` : 'GND'}
            unit={altitudeFt > 100 ? `${altitudeFt.toLocaleString()} ft` : ''}
            color={altitudeFt > 100 ? '#38bdf8' : '#facc15'}
          />
          <StatCard
            label="Speed"
            value={speedKnots}
            unit="kts"
            color="#4ade80"
          />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <StatCard
            label="Heading"
            value={`${Math.round(flight.heading)}°`}
            unit={headingDir}
          />
          <StatCard
            label="V/Speed"
            value={`${vspeedFpm > 0 ? '+' : ''}${vspeedFpm.toLocaleString()}`}
            unit="fpm"
            color={vspeedFpm > 100 ? '#4ade80' : vspeedFpm < -100 ? '#f97316' : '#888'}
          />
        </div>

        <SectionHeader title="Position" />
        <InfoRow label="Latitude" value={`${flight.lat.toFixed(5)}°`} />
        <InfoRow label="Longitude" value={`${flight.lon.toFixed(5)}°`} />
        <InfoRow label="Barometric Alt." value={`${altitudeFt.toLocaleString()} ft (${Math.round(flight.altitude).toLocaleString()} m)`} />
        {flight.geoAltitude !== undefined && flight.geoAltitude > 0 && (
          <InfoRow label="Geometric Alt." value={`${Math.round(flight.geoAltitude * 3.281).toLocaleString()} ft`} />
        )}
        <InfoRow label="Ground Speed" value={`${speedKnots} kts / ${speedKmh} km/h`} />

        <SectionHeader title="Aircraft" />
        <InfoRow label="ICAO 24-bit" value={flight.aircraftIcao} />
        {flight.aircraftType && <InfoRow label="Type" value={flight.aircraftType} />}
        {flight.registration && <InfoRow label="Registration" value={flight.registration} />}
        <InfoRow label="Callsign" value={flight.callsign} />
        {flight.squawk && <InfoRow label="Squawk" value={flight.squawk} />}

        {(flight.airline || flight.airlineIcao || flight.flightNumber) && (
          <>
            <SectionHeader title="Operator" />
            {flight.airline && <InfoRow label="Airline" value={flight.airline} />}
            {flight.airlineIcao && <InfoRow label="ICAO Code" value={flight.airlineIcao} />}
            {flight.flightNumber && <InfoRow label="Flight Number" value={flight.flightNumber} />}
          </>
        )}

        <div style={{
          marginTop: 16, padding: '10px 12px', background: '#141414', borderRadius: 6,
          fontSize: 9, color: '#555', lineHeight: 1.5, textAlign: 'center',
        }}>
          Data provided by OpenSky Network. Position updates every 10s.
        </div>
      </div>
    </div>
  );
}
