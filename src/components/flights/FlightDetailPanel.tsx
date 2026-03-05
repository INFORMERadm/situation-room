import type { FlightDetail, LiveFlightPosition } from '../../types';

interface FlightDetailPanelProps {
  detail: FlightDetail | null;
  liveFlight: LiveFlightPosition | null;
  loading: boolean;
  onClose: () => void;
}

function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatTimezone(tz: string): string {
  if (!tz) return '';
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

function computeProgress(detail: FlightDetail | null): number {
  if (!detail) return 0;
  if (detail.status === 'Landed') return 100;
  if (!detail.departureTime) return 0;
  const dep = new Date(detail.departureTime).getTime();
  if (isNaN(dep)) return 0;
  const now = Date.now();
  if (detail.arrivalTime) {
    const arr = new Date(detail.arrivalTime).getTime();
    if (!isNaN(arr) && arr > dep) {
      return Math.min(100, Math.max(0, ((now - dep) / (arr - dep)) * 100));
    }
  }
  if (detail.flightTime && detail.flightTime > 0) {
    const estArr = dep + detail.flightTime * 1000;
    return Math.min(100, Math.max(0, ((now - dep) / (estArr - dep)) * 100));
  }
  return 50;
}

function formatDistance(km: number | null): string {
  if (!km || km <= 0) return '';
  return `${Math.round(km)} km`;
}

function formatFlightDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function FlightDetailPanel({ detail, liveFlight, loading, onClose }: FlightDetailPanelProps) {
  const flight = liveFlight;
  if (!flight && !detail) return null;

  const callsign = flight?.callsign || detail?.callsign || '';
  const flightNumber = detail?.flightNumber || flight?.flightNumber || '';
  const airline = detail?.operatingAs || detail?.paintedAs || flight?.airlineName || '';
  const origIata = detail?.originIata || flight?.originIata || '';
  const destIata = detail?.destinationIata || flight?.destinationIata || '';
  const origCity = detail?.originCity || detail?.originName || '';
  const destCity = detail?.destinationCity || detail?.destinationName || '';
  const origCountry = detail?.originCountry || '';
  const destCountry = detail?.destinationCountry || '';
  const origTz = detail?.originTimezone ? formatTimezone(detail.originTimezone) : '';
  const destTz = detail?.destinationTimezone ? formatTimezone(detail.destinationTimezone) : '';
  const progress = computeProgress(detail);
  const aircraftType = detail?.aircraftType || flight?.aircraftType || '';
  const registration = detail?.registration || flight?.registration || '';
  const category = detail?.category || '';

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 340,
      height: '100%',
      background: '#0d0d0d',
      borderLeft: '1px solid #1a1a1a',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid #1a1a1a',
        background: '#111',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#ff9800', fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>
                {callsign || flightNumber || 'Unknown'}
              </span>
              {flightNumber && flightNumber !== callsign && (
                <span style={{
                  background: '#222',
                  color: '#ccc',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                }}>
                  {flightNumber}
                </span>
              )}
              {aircraftType && (
                <span style={{
                  background: '#222',
                  color: '#ccc',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                }}>
                  {aircraftType}
                </span>
              )}
            </div>
            {airline && (
              <div style={{ color: '#888', fontSize: 11, marginTop: 3 }}>{airline}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#666', fontSize: 12 }}>
            Loading flight details...
          </div>
        )}

        {/* Route Section */}
        <div style={{ padding: '16px 20px 12px', background: '#0f0f0f' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            {/* Origin */}
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 1,
                lineHeight: 1.1,
              }}>
                {origIata || '---'}
              </div>
              <div style={{ color: '#aaa', fontSize: 11, fontWeight: 500, marginTop: 2 }}>
                {origCity || origIata}
              </div>
              {origCountry && (
                <div style={{ color: '#555', fontSize: 9, marginTop: 1 }}>{origCountry}</div>
              )}
              {origTz && (
                <div style={{ color: '#444', fontSize: 8, marginTop: 1 }}>{origTz}</div>
              )}
            </div>

            {/* Arrow */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px 0',
            }}>
              <span style={{ color: '#ff9800', fontSize: 18 }}>&#9992;</span>
            </div>

            {/* Destination */}
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 1,
                lineHeight: 1.1,
              }}>
                {destIata || '---'}
              </div>
              <div style={{ color: '#aaa', fontSize: 11, fontWeight: 500, marginTop: 2 }}>
                {destCity || destIata}
              </div>
              {destCountry && (
                <div style={{ color: '#555', fontSize: 9, marginTop: 1 }}>{destCountry}</div>
              )}
              {destTz && (
                <div style={{ color: '#444', fontSize: 8, marginTop: 1 }}>{destTz}</div>
              )}
            </div>
          </div>

          {/* Times row */}
          {detail && (detail.departureTime || detail.arrivalTime) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 12,
              padding: '8px 0',
              borderTop: '1px solid #1a1a1a',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Departure
                </div>
                <div style={{ color: '#ddd', fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatTime(detail.departureTime)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {detail.status === 'Landed' ? 'Landed' : 'Estimated'}
                </div>
                <div style={{
                  color: detail.status === 'Landed' ? '#4caf50' : '#ddd',
                  fontSize: 20,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}>
                  {formatTime(detail.arrivalTime)}
                </div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {detail && detail.departureTime && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                height: 3,
                background: '#1a1a1a',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progress}%`,
                  background: '#ff9800',
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
                fontSize: 9,
                color: '#555',
              }}>
                {detail.actualDistance ? (
                  <>
                    <span>{formatDistance(detail.actualDistance * (progress / 100))}</span>
                    <span>{formatDistance(detail.actualDistance)}</span>
                  </>
                ) : detail.circleDistance ? (
                  <>
                    <span>{formatDistance(detail.circleDistance * (progress / 100))}</span>
                    <span>{formatDistance(detail.circleDistance)}</span>
                  </>
                ) : (
                  <>
                    <span>{Math.round(progress)}%</span>
                    <span>{detail.flightTime ? formatFlightDuration(detail.flightTime) : ''}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Position Section */}
        {flight && (
          <div style={{ padding: '0 20px' }}>
            <SectionLabel>Position</SectionLabel>
            <InfoRow
              label="Altitude"
              value={flight.altitude > 0 ? `${flight.altitude.toLocaleString()} ft` : 'On Ground'}
            />
            <InfoRow label="Ground Speed" value={`${Math.round(flight.groundSpeed)} kts`} />
            <InfoRow label="Heading" value={`${Math.round(flight.heading)}\u00B0`} />
            <InfoRow
              label="Vertical Speed"
              value={
                flight.verticalSpeed > 0
                  ? `+${flight.verticalSpeed} ft/min`
                  : flight.verticalSpeed < 0
                    ? `${flight.verticalSpeed} ft/min`
                    : 'Level'
              }
            />
            <InfoRow label="Latitude" value={flight.latitude.toFixed(4)} />
            <InfoRow label="Longitude" value={flight.longitude.toFixed(4)} />
            <InfoRow label="Status" value={flight.isOnGround ? 'On Ground' : 'Airborne'} accent />
          </div>
        )}

        {/* Aircraft Section */}
        <div style={{ padding: '0 20px' }}>
          <SectionLabel>Aircraft</SectionLabel>
          {aircraftType && (
            <InfoRow label="Aircraft Type" value={aircraftType} />
          )}
          {registration && (
            <InfoRow label="Registration" value={registration} accent />
          )}
          {flight?.squawk && (
            <InfoRow label="Squawk" value={flight.squawk} />
          )}
          {category && (
            <InfoRow label="Category" value={category} />
          )}
        </div>

        {/* Flight Info Section */}
        <div style={{ padding: '0 20px 20px' }}>
          <SectionLabel>Flight Info</SectionLabel>
          {flightNumber && <InfoRow label="Flight Number" value={flightNumber} accent />}
          {callsign && <InfoRow label="Callsign" value={callsign} />}
          {detail?.status && <InfoRow label="Status" value={detail.status} accent />}
          {detail?.flightTime && detail.flightTime > 0 && (
            <InfoRow label="Flight Duration" value={formatFlightDuration(detail.flightTime)} />
          )}
          {detail?.actualDistance && detail.actualDistance > 0 && (
            <InfoRow label="Distance" value={formatDistance(detail.actualDistance)} />
          )}
          {detail?.circleDistance && detail.circleDistance > 0 && !detail.actualDistance && (
            <InfoRow label="Distance (GC)" value={formatDistance(detail.circleDistance)} />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: '#555',
      marginTop: 16,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string | number | undefined | null; accent?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid #141414',
    }}>
      <span style={{ color: '#666', fontSize: 11 }}>{label}</span>
      <span style={{
        color: accent ? '#ff9800' : '#ccc',
        fontSize: 11,
        fontWeight: 500,
        textAlign: 'right',
        maxWidth: '60%',
        fontFamily: accent ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  );
}
