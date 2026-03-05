import { useEffect, useMemo } from 'react';
import { Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { AircraftTrack } from '../../types';

interface FlightTrackOverlayProps {
  track: AircraftTrack;
}

function formatTime(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatAlt(meters: number | null): string {
  if (meters == null) return '';
  return `${Math.round(meters * 3.281)} ft`;
}

function FitBounds({ track }: { track: AircraftTrack }) {
  const map = useMap();

  useEffect(() => {
    const points = track.path
      .filter(p => p[1] != null && p[2] != null)
      .map(p => [p[1] as number, p[2] as number] as [number, number]);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (points.length === 1) {
      map.setView(points[0], 10);
    }
  }, [map, track]);

  return null;
}

export default function FlightTrackOverlay({ track }: FlightTrackOverlayProps) {
  const validPoints = useMemo(() =>
    track.path.filter(p => p[1] != null && p[2] != null),
    [track.path],
  );

  const positions = useMemo(() =>
    validPoints.map(p => [p[1] as number, p[2] as number] as [number, number]),
    [validPoints],
  );

  if (positions.length < 2) return null;

  const startPoint = validPoints[0];
  const endPoint = validPoints[validPoints.length - 1];

  return (
    <>
      <FitBounds track={track} />

      <Polyline
        positions={positions}
        pathOptions={{
          color: '#ff9800',
          weight: 2.5,
          opacity: 0.8,
          dashArray: '6,4',
        }}
      />

      <CircleMarker
        center={[startPoint[1] as number, startPoint[2] as number]}
        radius={5}
        pathOptions={{
          fillColor: '#4caf50',
          fillOpacity: 1,
          color: '#1a1a1a',
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={1} className="flight-marker-tooltip">
          <div style={{ padding: '4px 6px', fontSize: 10 }}>
            <div style={{ fontWeight: 700, color: '#4caf50' }}>Start</div>
            <div>{formatTime(startPoint[0])}</div>
            {startPoint[3] != null && <div>{formatAlt(startPoint[3])}</div>}
          </div>
        </Tooltip>
      </CircleMarker>

      <CircleMarker
        center={[endPoint[1] as number, endPoint[2] as number]}
        radius={5}
        pathOptions={{
          fillColor: '#f44336',
          fillOpacity: 1,
          color: '#1a1a1a',
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={1} className="flight-marker-tooltip">
          <div style={{ padding: '4px 6px', fontSize: 10 }}>
            <div style={{ fontWeight: 700, color: '#f44336' }}>End</div>
            <div>{formatTime(endPoint[0])}</div>
            {endPoint[3] != null && <div>{formatAlt(endPoint[3])}</div>}
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
}
