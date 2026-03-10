import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MilitaryBase, BaseType } from '../../types';

const OPERATOR_PREFIX_COLORS: [string, string][] = [
  ['US ', '#4caf50'],
  ['US/', '#4caf50'],
  ['JMSDF', '#e91e63'],
  ['JASDF', '#e91e63'],
  ['ROK ', '#e91e63'],
  ['ROC ', '#ff9800'],
  ['PLA ', '#e53935'],
  ['Israeli', '#2196f3'],
  ['Iranian', '#f44336'],
  ['IRGC', '#f44336'],
  ['Russian', '#9c27b0'],
  ['Royal Air Force', '#00bcd4'],
  ['Royal Navy', '#00bcd4'],
  ['Royal Australian', '#00897b'],
  ['Royal Canadian', '#ef5350'],
  ['Royal Norwegian', '#0277bd'],
  ['Royal Saudi', '#2e7d32'],
  ['Royal Netherlands', '#ff6f00'],
  ['French ', '#00bcd4'],
  ['German ', '#ffa000'],
  ['Italian ', '#43a047'],
  ['Turkish ', '#d32f2f'],
  ['Polish ', '#c62828'],
  ['Belgian ', '#5d4037'],
  ['Indian ', '#ff6f00'],
  ['Pakistan ', '#1b5e20'],
  ['Korean People', '#b71c1c'],
  ['Egyptian ', '#795548'],
  ['Brazilian ', '#2e7d32'],
  ['UAE ', '#00838f'],
  ['Spanish ', '#e65100'],
  ['Republic of Singapore', '#d84315'],
  ['NATO', '#1565c0'],
];

function getOperatorColor(operator: string): string {
  for (const [prefix, color] of OPERATOR_PREFIX_COLORS) {
    if (operator.startsWith(prefix)) return color;
  }
  return '#c8a96e';
}

function getBaseIcon(baseType: BaseType, color: string): string {
  const svgs: Record<BaseType, string> = {
    air_base: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9"/></svg>`,
    naval_base: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 2v6M4 14l2-2c2-2 4-2 6-2s4 0 6 2l2 2M2 20c2-2 4-3 6-3 3 0 4 1.5 6 3 2-1.5 3-3 6-3"/><circle cx="12" cy="8" r="2" fill="${color}"/></svg>`,
    missile_defense: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 22V8M12 8l4-6M12 8L8 2M6 16h12M8 20h8"/><circle cx="12" cy="5" r="1.5" fill="${color}"/></svg>`,
    radar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 9V2"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12a10 10 0 0 1 20 0"/></svg>`,
    command_center: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M9 6V4a3 3 0 0 1 6 0v2"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="10" y1="13" x2="14" y2="13"/></svg>`,
    mixed: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><polygon points="12,2 22,12 12,22 2,12"/><circle cx="12" cy="12" r="3" fill="${color}" opacity="0.5"/></svg>`,
  };
  return svgs[baseType] || svgs.mixed;
}

function buildPopupContent(base: MilitaryBase): string {
  const color = getOperatorColor(base.operator);
  const equipmentRows = (base.equipment || [])
    .map(e => `<tr><td style="color:#ccc;padding:2px 8px 2px 0">${e.type}</td><td style="color:#888;padding:2px 0">${e.quantity}x</td></tr>`)
    .join('');

  return `<div style="font-family:inherit;min-width:200px;max-width:280px">
    <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:4px">${base.name}</div>
    <div style="font-size:10px;color:#999;margin-bottom:6px">${base.operator} &mdash; ${base.country}</div>
    <div style="font-size:10px;color:#bbb;margin-bottom:8px;line-height:1.4">${base.description}</div>
    ${equipmentRows ? `<table style="font-size:10px;width:100%;border-top:1px solid #333;padding-top:4px">${equipmentRows}</table>` : ''}
  </div>`;
}

interface Props {
  bases: MilitaryBase[];
}

export default function MilitaryBasesOverlay({ bases }: Props) {
  const map = useMap();
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const basesRef = useRef(bases);
  basesRef.current = bases;

  const syncMarkers = useCallback(() => {
    const bounds = map.getBounds();
    const existing = markerMapRef.current;
    const activeIds = new Set<string>();

    for (const base of basesRef.current) {
      if (!bounds.contains([base.latitude, base.longitude])) continue;
      activeIds.add(base.id);

      if (!existing.has(base.id)) {
        const color = getOperatorColor(base.operator);
        const icon = L.divIcon({
          html: getBaseIcon(base.base_type, color),
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([base.latitude, base.longitude], { icon }).addTo(map);
        marker.bindTooltip(
          `<div style="padding:4px 6px"><strong style="color:${color};font-size:11px">${base.name}</strong><br/><span style="color:#999;font-size:9px">${base.operator}</span></div>`,
          { direction: 'top', offset: [0, -10], opacity: 1, className: 'flight-marker-tooltip' }
        );
        marker.bindPopup(buildPopupContent(base), {
          className: 'military-popup',
          maxWidth: 300,
        });
        existing.set(base.id, marker);
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
  }, [bases, syncMarkers]);

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
