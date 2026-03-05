import type { FlightDetail, LiveFlightPosition } from '../../types';

interface InfoRowProps {
  label: string;
  value: string | number | undefined | null;
  accent?: boolean;
}

function InfoRow({ label, value, accent }: InfoRowProps) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a1a' }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <span style={{ color: accent ? '#ff9800' : '#ddd', fontSize: 11, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#666', marginTop: 14, marginBottom: 6 }}>
      {children}
    </div>
  );
}

interface FlightDetailPanelProps {
  detail: FlightDetail | null;
  liveFlight: LiveFlightPosition | null;
  loading: boolean;
  onClose: () => void;
}

export default function FlightDetailPanel({ detail, liveFlight, loading, onClose }: FlightDetailPanelProps) {
  const flight = liveFlight;
  if (!flight && !detail) return null;

  const callsign = detail?.callsign || flight?.callsign || '';
  const flightNumber = detail?.flightNumber || flight?.flightNumber || '';
  const airline = detail?.airlineName || flight?.airlineName || '';

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 320,
      height: '100%',
      background: 'rgba(10,10,10,0.97)',
      borderLeft: '1px solid #292929',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #292929',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#2196f3', fontSize: 18 }}>&#9992;</span>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {callsign || flightNumber || 'Unknown'}
            </div>
            {airline && <div style={{ color: '#aaa', fontSize: 11 }}>{airline}</div>}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 18,
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#888', fontSize: 12 }}>
            Loading flight details...
          </div>
        )}

        {flight && (
          <>
            <SectionLabel>Route</SectionLabel>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff9800', fontSize: 18, fontWeight: 700 }}>
                  {flight.originIata || '---'}
                </div>
                <div style={{ color: '#888', fontSize: 10, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detail?.originName || flight.originName || ''}
                </div>
                {detail?.originCity && (
                  <div style={{ color: '#666', fontSize: 9 }}>{detail.originCity}</div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                <div style={{ height: 1, flex: 1, background: '#333' }} />
                <span style={{ color: '#2196f3', fontSize: 14, padding: '0 6px' }}>&#9992;</span>
                <div style={{ height: 1, flex: 1, background: '#333' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff9800', fontSize: 18, fontWeight: 700 }}>
                  {flight.destinationIata || '---'}
                </div>
                <div style={{ color: '#888', fontSize: 10, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detail?.destinationName || flight.destinationName || ''}
                </div>
                {detail?.destinationCity && (
                  <div style={{ color: '#666', fontSize: 9 }}>{detail.destinationCity}</div>
                )}
              </div>
            </div>
          </>
        )}

        <SectionLabel>Position</SectionLabel>
        {flight && (
          <>
            <InfoRow label="Altitude" value={flight.altitude > 0 ? `${flight.altitude.toLocaleString()} ft` : 'On Ground'} />
            <InfoRow label="Ground Speed" value={`${Math.round(flight.groundSpeed)} kts`} />
            <InfoRow label="Heading" value={`${Math.round(flight.heading)}\u00B0`} />
            <InfoRow label="Vertical Speed" value={
              flight.verticalSpeed > 0
                ? `+${flight.verticalSpeed} ft/min`
                : flight.verticalSpeed < 0
                  ? `${flight.verticalSpeed} ft/min`
                  : 'Level'
            } />
            <InfoRow label="Latitude" value={flight.latitude.toFixed(4)} />
            <InfoRow label="Longitude" value={flight.longitude.toFixed(4)} />
            <InfoRow label="Status" value={flight.isOnGround ? 'On Ground' : 'Airborne'} accent />
          </>
        )}

        <SectionLabel>Aircraft</SectionLabel>
        <InfoRow label="Type" value={detail?.aircraftType || flight?.aircraftType} />
        <InfoRow label="Registration" value={detail?.registration || flight?.registration} />
        <InfoRow label="Squawk" value={flight?.squawk} />

        <SectionLabel>Flight Info</SectionLabel>
        <InfoRow label="Flight Number" value={flightNumber} />
        <InfoRow label="Callsign" value={callsign} />
        {detail?.status && <InfoRow label="Status" value={detail.status} accent />}
        {detail?.departureTime && <InfoRow label="Departure" value={detail.departureTime} />}
        {detail?.arrivalTime && <InfoRow label="Arrival" value={detail.arrivalTime} />}
      </div>
    </div>
  );
}
