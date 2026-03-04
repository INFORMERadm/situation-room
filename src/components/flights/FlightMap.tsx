import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { LiveFlight } from '../../types';

import 'leaflet/dist/leaflet.css';

interface Props {
  flights: LiveFlight[];
  selectedFlightId: string | null;
  onBoundsChange: (bounds: { lamin: number; lamax: number; lomin: number; lomax: number }) => void;
  onSelectFlight: (flightId: string) => void;
}

const PLANE_SVG = (heading: number, color: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.9))"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

function formatAltitude(meters: number): string {
  const ft = Math.round(meters * 3.281);
  if (ft < 100) return 'GND';
  return `FL${Math.round(ft / 100)}`;
}

function formatSpeed(ms: number): string {
  const kts = Math.round(ms * 1.944);
  return `${kts} kts`;
}

export default function FlightMap({ flights, selectedFlightId, onBoundsChange, onSelectFlight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const flightsRef = useRef(flights);
  const selectedRef = useRef(selectedFlightId);
  const onSelectRef = useRef(onSelectFlight);
  const onBoundsRef = useRef(onBoundsChange);

  flightsRef.current = flights;
  selectedRef.current = selectedFlightId;
  onSelectRef.current = onSelectFlight;
  onBoundsRef.current = onBoundsChange;

  const emitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    onBoundsRef.current({
      lamin: b.getSouth(),
      lamax: b.getNorth(),
      lomin: b.getWest(),
      lomax: b.getEast(),
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      worldCopyJump: true,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.on('moveend', emitBounds);
    mapRef.current = map;

    return () => {
      map.off('moveend', emitBounds);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [emitBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(flights.map(f => f.flightId));
    const existingMarkers = markersRef.current;

    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker);
        existingMarkers.delete(id);
      }
    });

    flights.forEach(f => {
      const isSelected = f.flightId === selectedFlightId;
      const color = isSelected ? '#ff9800' : '#38bdf8';
      const size = isSelected ? 22 : 14;

      const icon = L.divIcon({
        html: PLANE_SVG(f.heading, color, size),
        className: 'flight-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const tooltipContent = `<div style="font-family:system-ui,sans-serif;font-size:11px;line-height:1.5;min-width:120px">
        <div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:2px">${f.callsign || f.flightNumber || 'N/A'}</div>
        ${f.airline ? `<div style="color:#aaa;font-size:10px">${f.airline}</div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:4px;color:#ccc">
          <span>${formatAltitude(f.altitude)}</span>
          <span>${formatSpeed(f.speed)}</span>
        </div>
        ${f.origin || f.destination ? `<div style="color:#888;font-size:10px;margin-top:2px">${f.origin}${f.origin && f.destination ? ' → ' : ''}${f.destination}</div>` : ''}
      </div>`;

      const existing = existingMarkers.get(f.flightId);
      if (existing) {
        existing.setLatLng([f.lat, f.lon]);
        existing.setIcon(icon);
        existing.getTooltip()?.setContent(tooltipContent);
      } else {
        const marker = L.marker([f.lat, f.lon], { icon })
          .addTo(map)
          .bindTooltip(tooltipContent, {
            direction: 'top',
            offset: [0, -10],
            className: 'flight-tooltip',
            opacity: 1,
          })
          .on('click', () => {
            onSelectRef.current(f.flightId);
          });
        existingMarkers.set(f.flightId, marker);
      }
    });
  }, [flights, selectedFlightId]);

  useEffect(() => {
    if (!selectedFlightId || !mapRef.current) return;
    const f = flights.find(fl => fl.flightId === selectedFlightId);
    if (f) {
      mapRef.current.flyTo([f.lat, f.lon], Math.max(mapRef.current.getZoom(), 7), { duration: 1 });
    }
  }, [selectedFlightId, flights]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .leaflet-container { background: #0a0a0a; cursor: grab; }
        .leaflet-container:active { cursor: grabbing; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom a {
          background: #1a1a1a !important;
          color: #ccc !important;
          border-color: #333 !important;
        }
        .leaflet-control-zoom a:hover { background: #292929 !important; color: #fff !important; }
        .flight-marker { cursor: pointer !important; }
        .flight-tooltip {
          background: rgba(15, 15, 15, 0.95) !important;
          border: 1px solid #333 !important;
          border-radius: 6px !important;
          padding: 8px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
          color: #fff !important;
        }
        .flight-tooltip .leaflet-tooltip-arrow { display: none; }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
