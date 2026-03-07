import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { VesselPosition } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  tanker: '#ff9800',
  cargo: '#9e9e9e',
  passenger: '#ffffff',
  fishing: '#8bc34a',
  high_speed: '#03a9f4',
  special: '#e91e63',
};

function getVesselColor(shipType: string): string {
  return TYPE_COLORS[shipType] || '#666';
}

function buildVesselSvg(heading: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" style="transform:rotate(${heading}deg)"><path d="M12 2 L17 20 L12 16 L7 20 Z" fill="${color}" opacity="0.7"/></svg>`;
}

function buildClusterIcon(count: number): L.DivIcon {
  const size = count > 100 ? 36 : count > 50 ? 30 : 24;
  const bg = count > 100 ? 'rgba(255,152,0,0.5)' : count > 50 ? 'rgba(255,152,0,0.35)' : 'rgba(255,152,0,0.2)';
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:1px solid rgba(255,152,0,0.6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Props {
  vessels: VesselPosition[];
}

const CLUSTER_ZOOM_THRESHOLD = 7;
const CLUSTER_GRID_SIZE = 1;

interface ClusterCell {
  lat: number;
  lng: number;
  count: number;
  vessels: VesselPosition[];
}

export default function CommercialShippingOverlay({ vessels }: Props) {
  const map = useMap();
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterMarkersRef = useRef<L.Marker[]>([]);
  const vesselsRef = useRef(vessels);
  vesselsRef.current = vessels;

  const clearClusters = useCallback(() => {
    for (const m of clusterMarkersRef.current) m.remove();
    clusterMarkersRef.current = [];
  }, []);

  const clearIndividual = useCallback(() => {
    for (const [, marker] of markerMapRef.current) marker.remove();
    markerMapRef.current.clear();
  }, []);

  const syncMarkers = useCallback(() => {
    const currentVessels = vesselsRef.current;
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    if (zoom < CLUSTER_ZOOM_THRESHOLD) {
      clearIndividual();

      const cells = new Map<string, ClusterCell>();
      for (const v of currentVessels) {
        if (!bounds.contains([v.latitude, v.longitude])) continue;
        const cellLat = Math.floor(v.latitude / CLUSTER_GRID_SIZE) * CLUSTER_GRID_SIZE;
        const cellLng = Math.floor(v.longitude / CLUSTER_GRID_SIZE) * CLUSTER_GRID_SIZE;
        const key = `${cellLat},${cellLng}`;
        const cell = cells.get(key);
        if (cell) {
          cell.count++;
          cell.lat = (cell.lat * (cell.count - 1) + v.latitude) / cell.count;
          cell.lng = (cell.lng * (cell.count - 1) + v.longitude) / cell.count;
        } else {
          cells.set(key, { lat: v.latitude, lng: v.longitude, count: 1, vessels: [v] });
        }
      }

      clearClusters();
      for (const [, cell] of cells) {
        if (cell.count === 1) {
          const v = cell.vessels[0] || { latitude: cell.lat, longitude: cell.lng, courseOverGround: 0, shipType: 'other', name: '', speedOverGround: 0, destination: '' };
          const color = getVesselColor(v.shipType);
          const icon = L.divIcon({
            html: buildVesselSvg(v.courseOverGround, color),
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          const marker = L.marker([cell.lat, cell.lng], { icon }).addTo(map);
          clusterMarkersRef.current.push(marker);
        } else {
          const marker = L.marker([cell.lat, cell.lng], { icon: buildClusterIcon(cell.count) }).addTo(map);
          marker.bindTooltip(
            `<div style="padding:4px 6px;font-size:10px;color:#ccc">${cell.count} vessels</div>`,
            { direction: 'top', offset: [0, -10], opacity: 1, className: 'flight-marker-tooltip' }
          );
          marker.on('click', () => {
            map.setView([cell.lat, cell.lng], zoom + 2);
          });
          clusterMarkersRef.current.push(marker);
        }
      }
    } else {
      clearClusters();

      const existing = markerMapRef.current;
      const activeKeys = new Set<string>();

      for (const v of currentVessels) {
        if (!bounds.contains([v.latitude, v.longitude])) continue;
        const key = String(v.mmsi);
        activeKeys.add(key);

        const entry = existing.get(key);
        if (entry) {
          entry.setLatLng([v.latitude, v.longitude]);
          const color = getVesselColor(v.shipType);
          entry.setIcon(L.divIcon({
            html: buildVesselSvg(v.heading, color),
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          }));
          const tooltip = entry.getTooltip();
          if (tooltip) {
            tooltip.setContent(buildTooltipContent(v));
          }
        } else {
          const color = getVesselColor(v.shipType);
          const icon = L.divIcon({
            html: buildVesselSvg(v.heading, color),
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          const marker = L.marker([v.latitude, v.longitude], { icon }).addTo(map);
          marker.bindTooltip(buildTooltipContent(v), {
            direction: 'top',
            offset: [0, -8],
            opacity: 1,
            className: 'flight-marker-tooltip',
          });
          existing.set(key, marker);
        }
      }

      for (const [key, marker] of existing) {
        if (!activeKeys.has(key)) {
          marker.remove();
          existing.delete(key);
        }
      }
    }
  }, [map, clearClusters, clearIndividual]);

  useEffect(() => {
    syncMarkers();
  }, [vessels, syncMarkers]);

  useEffect(() => {
    const onMove = () => syncMarkers();
    map.on('moveend', onMove);
    map.on('zoomend', onMove);
    return () => {
      map.off('moveend', onMove);
      map.off('zoomend', onMove);
    };
  }, [map, syncMarkers]);

  useEffect(() => {
    return () => {
      clearClusters();
      clearIndividual();
    };
  }, [clearClusters, clearIndividual]);

  return null;
}

function buildTooltipContent(v: VesselPosition): string {
  const name = v.name || `MMSI: ${v.mmsi}`;
  const type = v.shipType !== 'other' ? v.shipType.charAt(0).toUpperCase() + v.shipType.slice(1) : '';
  const speed = v.speedOverGround > 0 ? `${v.speedOverGround.toFixed(1)} kn` : 'Stationary';
  const dest = v.destination || '';
  return `<div class="flight-tooltip"><strong style="color:${getVesselColor(v.shipType)}">${name}</strong>${type ? `<span>${type}</span>` : ''}<span>${speed}</span>${dest ? `<span>→ ${dest}</span>` : ''}</div>`;
}
