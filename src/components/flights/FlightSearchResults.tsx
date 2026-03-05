import type { OpenSkyFlight, AircraftTrack } from '../../types';

interface FlightSearchResultsProps {
  results: OpenSkyFlight[];
  activeTrack: AircraftTrack | null;
  onClear: () => void;
  onClearTrack: () => void;
}

function formatUnixTime(ts: number): string {
  if (!ts) return '--:--';
  const d = new Date(ts * 1000);
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDuration(startTs: number, endTs: number): string {
  if (!startTs || !endTs) return '';
  const diff = endTs - startTs;
  if (diff <= 0) return '';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function airportLabel(icao: string | null, _name?: string, iata?: string): string {
  if (iata) return iata;
  if (icao) return icao;
  return '---';
}

export default function FlightSearchResults({
  results,
  activeTrack,
  onClear,
  onClearTrack,
}: FlightSearchResultsProps) {
  if (activeTrack) {
    const validPoints = activeTrack.path.filter(p => p[1] != null && p[2] != null);
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{ color: '#888', fontSize: 11 }}>Track Result</span>
          <button onClick={onClearTrack} style={clearBtnStyle}>Clear</button>
        </div>
        <div style={{
          background: '#111',
          border: '1px solid #1a1a1a',
          borderRadius: 6,
          padding: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#ff9800', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
              {activeTrack.callsign || activeTrack.icao24}
            </span>
            <span style={{ color: '#666', fontSize: 10 }}>
              {activeTrack.icao24}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TrackRow label="Waypoints" value={String(validPoints.length)} />
            <TrackRow label="Duration" value={formatDuration(activeTrack.startTime, activeTrack.endTime)} />
            <TrackRow label="Start" value={formatUnixTime(activeTrack.startTime)} />
            <TrackRow label="End" value={formatUnixTime(activeTrack.endTime)} />
          </div>
          <div style={{
            marginTop: 8,
            padding: '4px 0',
            color: '#4caf50',
            fontSize: 10,
            textAlign: 'center',
          }}>
            Track displayed on map
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ color: '#888', fontSize: 11 }}>
          {results.length} flight{results.length !== 1 ? 's' : ''} found
        </span>
        <button onClick={onClear} style={clearBtnStyle}>Clear</button>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {results.map((f, i) => {
          const cs = f.callsign || f.icao24;
          const dep = airportLabel(
            f.estDepartureAirport,
            f.departureAirportName,
            f.departureIata,
          );
          const arr = airportLabel(
            f.estArrivalAirport,
            f.arrivalAirportName,
            f.arrivalIata,
          );
          return (
            <div
              key={`${f.icao24}-${f.firstSeen}-${i}`}
              style={{
                padding: '8px 10px',
                background: '#111',
                borderBottom: '1px solid #1a1a1a',
                borderRadius: i === 0 ? '6px 6px 0 0' : i === results.length - 1 ? '0 0 6px 6px' : 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  color: '#ff9800',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 12,
                }}>
                  {cs}
                </span>
                <span style={{ color: '#555', fontSize: 9 }}>{f.icao24}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 3,
                fontSize: 11,
              }}>
                <span style={{ color: '#ccc', fontWeight: 600 }}>{dep}</span>
                <span style={{ color: '#555' }}>&rarr;</span>
                <span style={{ color: '#ccc', fontWeight: 600 }}>{arr}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 3,
                fontSize: 9,
                color: '#666',
              }}>
                <span>{formatUnixTime(f.firstSeen)}</span>
                <span>{formatDuration(f.firstSeen, f.lastSeen)}</span>
                <span>{formatUnixTime(f.lastSeen)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrackRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color: '#ccc' }}>{value}</span>
    </div>
  );
}

const clearBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#888',
  fontSize: 10,
  padding: '2px 8px',
  cursor: 'pointer',
};
