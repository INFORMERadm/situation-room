import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CriticalInfrastructure, InfrastructureType, InfrastructureStatus } from '../../types';

const STATUS_COLORS: Record<InfrastructureStatus, string> = {
  intact: '#4caf50',
  damaged: '#ff9800',
  destroyed: '#f44336',
  unknown: '#9e9e9e',
};

const STATUS_PULSE: Record<InfrastructureStatus, boolean> = {
  intact: false,
  damaged: true,
  destroyed: true,
  unknown: false,
};

function getInfraIcon(type: InfrastructureType, status: InfrastructureStatus): string {
  const color = STATUS_COLORS[status];
  const pulse = STATUS_PULSE[status];
  const pulseRing = pulse
    ? `<circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>`
    : '';

  const icons: Record<InfrastructureType, string> = {
    airport: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${color}" transform="scale(0.55) translate(10.5,10.5)"/></svg>`,
    port: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M12 2v6M4 14l2-2c2-2 4-2 6-2s4 0 6 2l2 2" stroke="${color}" stroke-width="2.5" fill="none"/><circle cx="12" cy="8" r="2.5" fill="${color}"/></g></svg>`,
    highway: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M4 20L8 4M16 4l4 16M8 4h8M9 10h6M9 16h6" stroke="${color}" stroke-width="2.5" fill="none"/></g></svg>`,
    electricity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="${color}"/></g></svg>`,
    nuclear: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><circle cx="12" cy="12" r="3" fill="${color}"/><path d="M12 9C10 5.5 7 4 4 5L7 10.5M12 9C14 5.5 17 4 20 5L17 10.5M12 15C12 19 10 21.5 7.5 22L10.5 16.5M12 15C12 19 14 21.5 16.5 22L13.5 16.5M7 10.5C3.5 10 2 12 2.5 15L8 13.5M17 10.5C20.5 10 22 12 21.5 15L16 13.5M10.5 16.5C9 19.5 6.5 20 4 19L7.5 15M13.5 16.5C15 19.5 17.5 20 20 19L16.5 15" stroke="${color}" stroke-width="1.5" fill="none"/></g></svg>`,
    government: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><rect x="3" y="11" width="18" height="11" stroke="${color}" stroke-width="2" fill="none"/><path d="M3 11L12 2l9 9" stroke="${color}" stroke-width="2" fill="none"/><rect x="9" y="16" width="6" height="6" stroke="${color}" stroke-width="1.5" fill="none"/></g></svg>`,
    military_intel: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M12 2L2 7v5c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V7L12 2z" stroke="${color}" stroke-width="2" fill="none"/><path d="M9 12l2 2 4-4" stroke="${color}" stroke-width="2.5" fill="none"/></g></svg>`,
    pipeline: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M2 9h20M2 15h20" stroke="${color}" stroke-width="2.5" fill="none"/><path d="M6 9v6M18 9v6" stroke="${color}" stroke-width="2" fill="none"/><circle cx="4" cy="12" r="2" fill="${color}"/><circle cx="20" cy="12" r="2" fill="${color}"/></g></svg>`,
    refinery: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><rect x="8" y="10" width="8" height="12" stroke="${color}" stroke-width="2" fill="none"/><path d="M10 10V6M14 10V4M12 10V7" stroke="${color}" stroke-width="1.5" fill="none"/><path d="M8 22H16" stroke="${color}" stroke-width="2"/><circle cx="10" cy="6" r="1.5" fill="${color}"/><circle cx="14" cy="4" r="1.5" fill="${color}"/></g></svg>`,
    undersea_cable: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M2 12c2-4 4-6 6-6s4 4 6 4 4-6 6-6" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M2 16c2-4 4-6 6-6s4 4 6 4 4-6 6-6" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/></g></svg>`,
    water: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M12 2C6 10 4 13 4 16a8 8 0 0 0 16 0c0-3-2-6-8-14z" fill="${color}" opacity="0.8"/></g></svg>`,
    telecom: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><g transform="scale(0.5) translate(12,12)"><path d="M12 22V12M12 12l-4-6M12 12l4-6M8 6H16" stroke="${color}" stroke-width="2" fill="none"/><path d="M6 4c0-2 3-4 6-4s6 2 6 4" stroke="${color}" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill="${color}"/></g></svg>`,
    other: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">${pulseRing}<circle cx="12" cy="12" r="9" fill="#111" stroke="${color}" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="${color}" opacity="0.8"/></svg>`,
  };

  return icons[type] || icons.other;
}

const INFRA_TYPE_LABELS: Record<InfrastructureType, string> = {
  airport: 'Airport',
  port: 'Port',
  highway: 'Strategic Route',
  electricity: 'Power Infrastructure',
  nuclear: 'Nuclear Site',
  government: 'Government Installation',
  military_intel: 'Military / Intelligence',
  pipeline: 'Pipeline / Energy Route',
  refinery: 'Refinery / Processing',
  undersea_cable: 'Undersea Cable',
  water: 'Water Infrastructure',
  telecom: 'Telecommunications',
  other: 'Other',
};

function buildPopupContent(item: CriticalInfrastructure): string {
  const color = STATUS_COLORS[item.status];
  const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);
  const typeLabel = INFRA_TYPE_LABELS[item.infra_type] || item.infra_type;

  const incidentSection = item.last_incident_date || item.incident_notes
    ? `<div style="border-top:1px solid #2a2a2a;margin-top:8px;padding-top:8px">
        ${item.last_incident_date ? `<div style="color:#888;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Last Incident: <span style="color:#bbb">${item.last_incident_date}</span></div>` : ''}
        ${item.incident_notes ? `<div style="color:#aaa;font-size:10px;line-height:1.4">${item.incident_notes}</div>` : ''}
      </div>`
    : '';

  const sourceLink = item.source_url
    ? `<div style="margin-top:6px"><a href="${item.source_url}" target="_blank" rel="noopener" style="color:#2196f3;font-size:9px;text-decoration:none">View source &rarr;</a></div>`
    : '';

  return `<div style="font-family:inherit;min-width:220px;max-width:300px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="display:inline-block;padding:2px 6px;border-radius:3px;background:${color}22;border:1px solid ${color}44;color:${color};font-size:9px;font-weight:700;text-transform:uppercase">${statusLabel}</span>
      <span style="color:#666;font-size:9px">${typeLabel}</span>
    </div>
    <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:2px">${item.name}</div>
    <div style="font-size:10px;color:#888;margin-bottom:6px">${item.country}${item.region && item.region !== item.country ? ' &mdash; ' + item.region : ''}</div>
    ${item.description ? `<div style="font-size:10px;color:#bbb;line-height:1.4;margin-bottom:4px">${item.description}</div>` : ''}
    ${incidentSection}
    ${sourceLink}
  </div>`;
}

interface Props {
  infrastructure: CriticalInfrastructure[];
}

export default function CriticalInfrastructureOverlay({ infrastructure }: Props) {
  const map = useMap();
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const infraRef = useRef(infrastructure);
  infraRef.current = infrastructure;

  const syncMarkers = useCallback(() => {
    const bounds = map.getBounds();
    const existing = markerMapRef.current;
    const activeIds = new Set<string>();

    for (const item of infraRef.current) {
      if (!bounds.contains([item.latitude, item.longitude])) continue;
      activeIds.add(item.id);

      if (!existing.has(item.id)) {
        const iconHtml = getInfraIcon(item.infra_type, item.status);
        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const color = STATUS_COLORS[item.status];
        const typeLabel = INFRA_TYPE_LABELS[item.infra_type] || item.infra_type;

        const marker = L.marker([item.latitude, item.longitude], { icon }).addTo(map);
        marker.bindTooltip(
          `<div style="padding:4px 6px"><strong style="color:${color};font-size:11px">${item.name}</strong><br/><span style="color:#999;font-size:9px">${typeLabel} &bull; ${item.country}</span></div>`,
          { direction: 'top', offset: [0, -10], opacity: 1, className: 'flight-marker-tooltip' }
        );
        marker.bindPopup(buildPopupContent(item), {
          className: 'military-popup',
          maxWidth: 320,
        });
        existing.set(item.id, marker);
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
  }, [infrastructure, syncMarkers]);

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
