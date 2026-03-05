import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LiveFlightPosition } from '../../types';

import 'leaflet/dist/leaflet.css';

function createPlaneIcon(heading: number, isSelected: boolean, isOnGround: boolean) {
  const color = isSelected ? '#ff9800' : isOnGround ? '#666' : '#2196f3';
  const size = isSelected ? 18 : 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg)"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function formatAlt(alt: number) {
  if (alt >= 1000) return `${(alt / 1000).toFixed(1)}k ft`;
  return `${alt} ft`;
}

function formatSpeed(spd: number) {
  return `${Math.round(spd)} kts`;
}

interface FlightMarkersProps {
  flights: LiveFlightPosition[];
  selectedFlightId: string | null;
  onSelect: (flight: LiveFlightPosition) => void;
  onHover: (flight: LiveFlightPosition | null) => void;
}

function FlightMarkers({ flights, selectedFlightId, onSelect, onHover }: FlightMarkersProps) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = map.getBounds();
    const visible = flights.filter(f => bounds.contains([f.latitude, f.longitude]));

    const maxMarkers = 800;
    const toRender = visible.length > maxMarkers ? visible.slice(0, maxMarkers) : visible;

    toRender.forEach(flight => {
      const isSelected = flight.flightId === selectedFlightId;
      const icon = createPlaneIcon(flight.heading, isSelected, flight.isOnGround);
      const marker = L.marker([flight.latitude, flight.longitude], { icon })
        .addTo(map);

      const routeStr = flight.originIata && flight.destinationIata
        ? `${flight.originIata} → ${flight.destinationIata}`
        : flight.originIata || flight.destinationIata || '';

      const tooltipContent = `<div style="font-family:inherit;font-size:11px;line-height:1.4;min-width:120px">
        <div style="font-weight:700;color:#fff;margin-bottom:2px">${flight.callsign || flight.flightNumber || 'N/A'}</div>
        ${flight.airlineName ? `<div style="color:#aaa;font-size:10px">${flight.airlineName}</div>` : ''}
        ${routeStr ? `<div style="color:#ff9800;font-size:10px;margin-top:2px">${routeStr}</div>` : ''}
        <div style="color:#888;font-size:10px;margin-top:2px">${formatAlt(flight.altitude)} · ${formatSpeed(flight.groundSpeed)}</div>
        ${flight.aircraftType ? `<div style="color:#666;font-size:10px">${flight.aircraftType} ${flight.registration ? `· ${flight.registration}` : ''}</div>` : ''}
      </div>`;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -8],
        className: 'flight-tooltip',
        opacity: 1,
      });

      marker.on('click', () => onSelect(flight));
      marker.on('mouseover', () => onHover(flight));
      marker.on('mouseout', () => onHover(null));

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [flights, selectedFlightId, map, onSelect, onHover]);

  useEffect(() => {
    const handler = () => {
      map.fire('moveend');
    };
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  return null;
}

interface FlightMapProps {
  flights: LiveFlightPosition[];
  selectedFlightId: string | null;
  loading: boolean;
  error: string | null;
  onSelectFlight: (flight: LiveFlightPosition) => void;
  onHoverFlight: (flight: LiveFlightPosition | null) => void;
}

export default function FlightMap({
  flights,
  selectedFlightId,
  loading,
  error,
  onSelectFlight,
  onHoverFlight,
}: FlightMapProps) {
  const flightCount = useMemo(() => flights.length, [flights]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0a' }}>
      <MapContainer
        center={[30, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={16}
        style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          className="flight-map-tiles"
        />
        <FlightMarkers
          flights={flights}
          selectedFlightId={selectedFlightId}
          onSelect={onSelectFlight}
          onHover={onHoverFlight}
        />
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        gap: 8,
        zIndex: 1000,
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '6px 12px',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ color: '#2196f3', fontSize: 14 }}>&#9992;</span>
          {loading && flightCount === 0 ? 'Loading...' : `${flightCount.toLocaleString()} flights`}
        </div>
        {error && (
          <div style={{
            background: 'rgba(244,67,54,0.15)',
            border: '1px solid #f44336',
            borderRadius: 6,
            padding: '6px 12px',
            color: '#f44336',
            fontSize: 11,
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 12,
        zIndex: 1000,
        display: 'flex',
        gap: 12,
        fontSize: 9,
        color: '#666',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2196f3', display: 'inline-block' }} />
          Airborne
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#666', display: 'inline-block' }} />
          On Ground
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9800', display: 'inline-block' }} />
          Selected
        </span>
      </div>

      <style>{`
        .flight-tooltip {
          background: rgba(10,10,10,0.95) !important;
          border: 1px solid #333 !important;
          border-radius: 6px !important;
          padding: 8px 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
          color: #fff !important;
        }
        .flight-tooltip::before {
          border-top-color: #333 !important;
        }
        .leaflet-container {
          background: #0a0a0a !important;
          font-family: inherit !important;
        }
      `}</style>
    </div>
  );
}
