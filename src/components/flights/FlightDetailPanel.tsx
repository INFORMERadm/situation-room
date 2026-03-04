import type { FlightDetail } from '../../types';

interface Props {
  flight: FlightDetail;
  loading: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontSize: 11, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '--'}</span>
    </div>
  );
}

function AirportBlock({ code, name, city, country, time, label }: {
  code: string; name: string; city: string; country: string; time: string; label: string;
}) {
  const formattedTime = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
  return (
    <div style={{ flex: 1, textAlign: label === 'Origin' ? 'left' : 'right' }}>
      <div style={{ fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{code || '---'}</div>
      <div style={{ fontSize: 10, color: '#aaa', marginTop: 2, lineHeight: 1.3 }}>{name || 'Unknown'}</div>
      <div style={{ fontSize: 9, color: '#666' }}>{[city, country].filter(Boolean).join(', ')}</div>
      <div style={{ fontSize: 11, color: '#ff9800', marginTop: 4, fontWeight: 600 }}>{formattedTime}</div>
    </div>
  );
}

export default function FlightDetailPanel({ flight, loading, onClose }: Props) {
  if (loading) {
    return (
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
        background: '#0d0d0d', borderLeft: '1px solid #292929', zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888',
      }}>
        Loading flight details...
      </div>
    );
  }

  const altitudeFt = Math.round(flight.altitude * 3.281);
  const speedKnots = Math.round(flight.speed * 0.54);
  const vspeedFpm = Math.round(flight.verticalSpeed * 196.85);

  let statusColor = '#38bdf8';
  let statusLabel = flight.status || 'En Route';
  if (flight.verticalSpeed > 2) { statusColor = '#4ade80'; statusLabel = 'Climbing'; }
  else if (flight.verticalSpeed < -2) { statusColor = '#f97316'; statusLabel = 'Descending'; }
  else if (flight.altitude < 50) { statusColor = '#facc15'; statusLabel = 'On Ground'; }

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
      background: '#0d0d0d', borderLeft: '1px solid #292929', zIndex: 1001,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #292929', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {flight.flightNumber || flight.callsign}
          </div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{flight.airline}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #333', borderRadius: 4,
            color: '#aaa', cursor: 'pointer', width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0', borderBottom: '1px solid #1a1a1a',
        }}>
          <AirportBlock
            code={flight.origin} name={flight.originName}
            city={flight.originCity} country={flight.originCountry}
            time={flight.departureTime} label="Origin"
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff9800" style={{ transform: `rotate(90deg)` }}>
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            {flight.distanceKm > 0 && (
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{flight.distanceKm.toLocaleString()} km</div>
            )}
          </div>
          <AirportBlock
            code={flight.destination} name={flight.destinationName}
            city={flight.destinationCity} country={flight.destinationCountry}
            time={flight.arrivalTime} label="Destination"
          />
        </div>

        {flight.progressPct > 0 && (
          <div style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#888' }}>Progress</span>
              <span style={{ fontSize: 10, color: '#ff9800', fontWeight: 600 }}>{flight.progressPct}%</span>
            </div>
            <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${flight.progressPct}%`,
                background: 'linear-gradient(90deg, #ff9800, #fb8c00)', borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        <div style={{ padding: '8px 0 4px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#1a1a1a', borderRadius: 4, padding: '4px 10px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
          </div>
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Flight Data
          </div>
          <InfoRow label="Altitude" value={`${altitudeFt.toLocaleString()} ft (FL${Math.round(altitudeFt / 100)})`} />
          <InfoRow label="Ground Speed" value={`${speedKnots} kts (${Math.round(flight.speed)} km/h)`} />
          <InfoRow label="Vertical Speed" value={`${vspeedFpm > 0 ? '+' : ''}${vspeedFpm.toLocaleString()} fpm`} />
          <InfoRow label="Heading" value={`${Math.round(flight.heading)}deg`} />
          <InfoRow label="Squawk" value={flight.squawk} />
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Aircraft
          </div>
          <InfoRow label="Type" value={flight.aircraftType} />
          <InfoRow label="ICAO Code" value={flight.aircraftIcao} />
          <InfoRow label="Registration" value={flight.registration} />
          <InfoRow label="Callsign" value={flight.callsign} />
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Airline
          </div>
          <InfoRow label="Name" value={flight.airline} />
          <InfoRow label="ICAO" value={flight.airlineIcao} />
          <InfoRow label="Flight No." value={flight.flightNumber} />
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Position
          </div>
          <InfoRow label="Latitude" value={flight.lat.toFixed(4)} />
          <InfoRow label="Longitude" value={flight.lon.toFixed(4)} />
        </div>
      </div>
    </div>
  );
}
