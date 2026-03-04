import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LiveFlight } from '../../types';

import 'leaflet/dist/leaflet.css';

interface Props {
  flights: LiveFlight[];
  selectedFlightId: string | null;
  onBoundsChange: (bounds: { lamin: number; lamax: number; lomin: number; lomax: number }) => void;
  onSelectFlight: (flightId: string) => void;
}

function createPlaneIcon(heading: number, isSelected: boolean): L.DivIcon {
  const color = isSelected ? '#ff9800' : '#38bdf8';
  const size = isSelected ? 20 : 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg);filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: Props['onBoundsChange'] }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        lamin: b.getSouth(),
        lamax: b.getNorth(),
        lomin: b.getWest(),
        lomax: b.getEast(),
      });
    },
  });
  return null;
}

function FlyToFlight({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prevRef = useRef({ lat: 0, lon: 0 });

  useEffect(() => {
    if (lat && lon && (lat !== prevRef.current.lat || lon !== prevRef.current.lon)) {
      prevRef.current = { lat, lon };
      map.flyTo([lat, lon], Math.max(map.getZoom(), 7), { duration: 1 });
    }
  }, [lat, lon, map]);

  return null;
}

export default function FlightMap({ flights, selectedFlightId, onBoundsChange, onSelectFlight }: Props) {
  const selectedFlight = useMemo(
    () => flights.find(f => f.flightId === selectedFlightId),
    [flights, selectedFlightId]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .leaflet-container { background: #0a0a0a; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom a {
          background: #1a1a1a !important;
          color: #ccc !important;
          border-color: #333 !important;
        }
        .leaflet-control-zoom a:hover { background: #292929 !important; color: #fff !important; }
      `}</style>
      <MapContainer
        center={[30, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={16}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        worldCopyJump={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <BoundsWatcher onBoundsChange={onBoundsChange} />

        {selectedFlight && (
          <FlyToFlight lat={selectedFlight.lat} lon={selectedFlight.lon} />
        )}

        {flights.map(f => (
          <Marker
            key={f.flightId}
            position={[f.lat, f.lon]}
            icon={createPlaneIcon(f.heading, f.flightId === selectedFlightId)}
            eventHandlers={{
              click: () => onSelectFlight(f.flightId),
            }}
          />
        ))}
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: 10,
        left: 56,
        background: 'rgba(10,10,10,0.85)',
        border: '1px solid #333',
        borderRadius: 6,
        padding: '6px 12px',
        color: '#ccc',
        fontSize: 11,
        fontWeight: 600,
        zIndex: 1000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
        {flights.length.toLocaleString()} aircraft
      </div>
    </div>
  );
}
