import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MilitaryNavalAsset, NavalAssetType } from '../../types';

const OPERATOR_COLORS: Record<string, string> = {
  'US Navy': '#4caf50',
  'Royal Navy': '#00bcd4',
  'French Navy': '#00bcd4',
  'Iranian Navy': '#f44336',
  'IRGC Navy': '#f44336',
};

function getColor(operator: string): string {
  return OPERATOR_COLORS[operator] || '#c8a96e';
}

function getShipSize(type: NavalAssetType): number {
  const sizes: Record<NavalAssetType, number> = {
    carrier: 22,
    amphibious: 18,
    cruiser: 16,
    destroyer: 14,
    frigate: 13,
    submarine: 14,
    corvette: 12,
    support: 12,
    patrol: 10,
  };
  return sizes[type] || 12;
}

function buildShipSvg(heading: number, color: string, size: number, type: NavalAssetType): string {
  if (type === 'submarine') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" opacity="0.8" style="transform:rotate(${heading}deg)"><ellipse cx="12" cy="12" rx="10" ry="4"/><line x1="12" y1="8" x2="12" y2="3" stroke="${color}" stroke-width="1.5"/><line x1="12" y1="3" x2="16" y2="5" stroke="${color}" stroke-width="1"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="transform:rotate(${heading}deg)"><path d="M12 2 L18 20 L12 17 L6 20 Z" fill="${color}" opacity="0.85" stroke="${color}" stroke-width="0.5"/></svg>`;
}

function getStalenessColor(dateStr: string): string {
  if (!dateStr) return '#f44336';
  const reported = new Date(dateStr).getTime();
  const ageMs = Date.now() - reported;
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days <= 2) return '#4caf50';
  if (days <= 7) return '#ff9800';
  return '#f44336';
}

function buildPopupContent(asset: MilitaryNavalAsset): string {
  const color = getColor(asset.operator);
  const staleColor = getStalenessColor(asset.last_reported_date);
  return `<div style="font-family:inherit;min-width:180px">
    <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:2px">${asset.name}</div>
    <div style="font-size:10px;color:#999;margin-bottom:6px">${asset.hull_number} &mdash; ${asset.class_name}</div>
    <table style="font-size:10px;width:100%">
      <tr><td style="color:#888;padding:1px 8px 1px 0">Operator</td><td style="color:#ccc">${asset.operator}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0">Type</td><td style="color:#ccc">${asset.asset_type}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0">Region</td><td style="color:#ccc">${asset.region}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0">Status</td><td style="color:#ccc">${asset.status}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0">Reported</td><td><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${staleColor};margin-right:4px"></span><span style="color:#ccc">${asset.last_reported_date || 'Unknown'}</span></td></tr>
    </table>
    ${asset.source_description ? `<div style="font-size:9px;color:#666;margin-top:6px;border-top:1px solid #333;padding-top:4px">${asset.source_description}</div>` : ''}
  </div>`;
}

interface Props {
  navalAssets: MilitaryNavalAsset[];
}

export default function NavalAssetsOverlay({ navalAssets }: Props) {
  const map = useMap();
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const assetsRef = useRef(navalAssets);
  assetsRef.current = navalAssets;

  const syncMarkers = useCallback(() => {
    const bounds = map.getBounds();
    const existing = markerMapRef.current;
    const activeIds = new Set<string>();

    for (const asset of assetsRef.current) {
      if (!bounds.contains([asset.latitude, asset.longitude])) continue;
      activeIds.add(asset.id);

      const entry = existing.get(asset.id);
      if (entry) {
        entry.setLatLng([asset.latitude, asset.longitude]);
      } else {
        const color = getColor(asset.operator);
        const size = getShipSize(asset.asset_type);
        const icon = L.divIcon({
          html: buildShipSvg(asset.heading, color, size, asset.asset_type),
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([asset.latitude, asset.longitude], { icon }).addTo(map);
        marker.bindTooltip(
          `<div style="padding:4px 6px"><strong style="color:${color};font-size:11px">${asset.name}</strong><br/><span style="color:#999;font-size:9px">${asset.hull_number} ${asset.class_name}</span></div>`,
          { direction: 'top', offset: [0, -10], opacity: 1, className: 'flight-marker-tooltip' }
        );
        marker.bindPopup(buildPopupContent(asset), {
          className: 'military-popup',
          maxWidth: 280,
        });
        existing.set(asset.id, marker);
      }
    }

    for (const [id, marker] of existing) {
      if (!activeIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
  }, [map]);

  useEffect(() => {
    syncMarkers();
  }, [navalAssets, syncMarkers]);

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
      for (const [, marker] of markerMapRef.current) marker.remove();
      markerMapRef.current.clear();
    };
  }, []);

  return null;
}
