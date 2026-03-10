import { useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LiveFlightPosition, AircraftTrack, MilitaryBase, MilitaryNavalAsset, VesselPosition, StrikeEvent, MapLayerName } from '../../types';
import FlightTrackOverlay from './FlightTrackOverlay';
import MilitaryBasesOverlay from './MilitaryBasesOverlay';
import NavalAssetsOverlay from './NavalAssetsOverlay';
import CommercialShippingOverlay from './CommercialShippingOverlay';
import StrikeAnimationOverlay from './StrikeAnimationOverlay';
import StrikeAlertBanner from './StrikeAlertBanner';
import MapLayerControl from './MapLayerControl';

import 'leaflet/dist/leaflet.css';

function buildPlaneSvg(heading: number, isSelected: boolean, isOnGround: boolean) {
  const color = isSelected ? '#ff9800' : isOnGround ? '#666' : '#2196f3';
  const size = isSelected ? 18 : 14;
  return {
    size,
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg)"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
  };
}

function createPlaneIcon(heading: number, isSelected: boolean, isOnGround: boolean) {
  const { size, html } = buildPlaneSvg(heading, isSelected, isOnGround);
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildTooltipContent(flight: LiveFlightPosition): string {
  const label = flight.flightNumber || flight.callsign || 'N/A';
  const aircraft = flight.aircraftType || '---';
  const route =
    flight.originIata && flight.destinationIata
      ? `${flight.originIata} → ${flight.destinationIata}`
      : flight.originIata || flight.destinationIata || '---';
  const alt = flight.isOnGround
    ? 'On Ground'
    : `${Math.round(flight.altitude).toLocaleString()} ft`;

  return `<div class="flight-tooltip"><strong>${label}</strong><span>${aircraft}</span><span>${route}</span><span>${alt}</span></div>`;
}

interface MarkerEntry {
  marker: L.Marker;
  heading: number;
  isSelected: boolean;
  isOnGround: boolean;
}

interface FlightMarkersProps {
  flights: LiveFlightPosition[];
  selectedFlightId: string | null;
  onSelect: (flight: LiveFlightPosition) => void;
}

function FlightMarkers({ flights, selectedFlightId, onSelect }: FlightMarkersProps) {
  const map = useMap();
  const markerMapRef = useRef<Map<string, MarkerEntry>>(new Map());
  const flightsRef = useRef(flights);
  const selectedRef = useRef(selectedFlightId);
  const onSelectRef = useRef(onSelect);
  const throttleRef = useRef(0);

  flightsRef.current = flights;
  selectedRef.current = selectedFlightId;
  onSelectRef.current = onSelect;

  const syncMarkers = useCallback(() => {
    const now = performance.now();
    if (now - throttleRef.current < 50) return;
    throttleRef.current = now;

    const currentFlights = flightsRef.current;
    const selected = selectedRef.current;
    const bounds = map.getBounds();
    const existing = markerMapRef.current;

    const activeIds = new Set<string>();

    for (const flight of currentFlights) {
      if (!bounds.contains([flight.latitude, flight.longitude])) continue;

      activeIds.add(flight.flightId);
      const isSelected = flight.flightId === selected;
      const entry = existing.get(flight.flightId);

      if (entry) {
        entry.marker.setLatLng([flight.latitude, flight.longitude]);

        const headingChanged = Math.abs(entry.heading - flight.heading) > 3;
        const selectionChanged = entry.isSelected !== isSelected;
        const groundChanged = entry.isOnGround !== flight.isOnGround;

        if (headingChanged || selectionChanged || groundChanged) {
          entry.marker.setIcon(createPlaneIcon(flight.heading, isSelected, flight.isOnGround));
          entry.heading = flight.heading;
          entry.isSelected = isSelected;
          entry.isOnGround = flight.isOnGround;
        }

        const tooltip = entry.marker.getTooltip();
        if (tooltip) {
          tooltip.setContent(buildTooltipContent(flight));
        }
      } else {
        const icon = createPlaneIcon(flight.heading, isSelected, flight.isOnGround);
        const marker = L.marker([flight.latitude, flight.longitude], { icon }).addTo(map);
        marker.bindTooltip(buildTooltipContent(flight), {
          direction: 'top',
          offset: [0, -10],
          opacity: 1,
          className: 'flight-marker-tooltip',
        });
        const flightId = flight.flightId;
        marker.on('click', () => {
          const f = flightsRef.current.find(fl => fl.flightId === flightId);
          if (f) onSelectRef.current(f);
        });
        existing.set(flight.flightId, {
          marker,
          heading: flight.heading,
          isSelected,
          isOnGround: flight.isOnGround,
        });
      }
    }

    for (const [id, entry] of existing) {
      if (!activeIds.has(id)) {
        entry.marker.remove();
        existing.delete(id);
      }
    }
  }, [map]);

  useEffect(() => {
    syncMarkers();
  }, [flights, selectedFlightId, syncMarkers]);

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
      for (const [, entry] of markerMapRef.current) {
        entry.marker.remove();
      }
      markerMapRef.current.clear();
    };
  }, []);

  return null;
}

interface FlightMapProps {
  flights: LiveFlightPosition[];
  selectedFlightId: string | null;
  loading: boolean;
  error: string | null;
  onSelectFlight: (flight: LiveFlightPosition) => void;
  activeTrack?: AircraftTrack | null;
  militaryBases: MilitaryBase[];
  navalAssets: MilitaryNavalAsset[];
  vessels: VesselPosition[];
  layers: Record<MapLayerName, boolean>;
  onToggleLayer: (layer: MapLayerName) => void;
  vesselCount: number;
  shippingLoading?: boolean;
  shippingError?: string | null;
  strikeEvents: StrikeEvent[];
  strikeNewEventIds: Set<string>;
  onClearStrikeNew: () => void;
}

export default function FlightMap({
  flights,
  selectedFlightId,
  loading,
  error,
  onSelectFlight,
  activeTrack,
  militaryBases,
  navalAssets,
  vessels,
  layers,
  onToggleLayer,
  vesselCount,
  shippingLoading,
  shippingError,
  strikeEvents,
  strikeNewEventIds,
  onClearStrikeNew,
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
        {layers.flights && (
          <FlightMarkers
            flights={flights}
            selectedFlightId={selectedFlightId}
            onSelect={onSelectFlight}
          />
        )}
        {activeTrack && <FlightTrackOverlay track={activeTrack} />}
        {layers['military-bases'] && <MilitaryBasesOverlay bases={militaryBases} />}
        {layers['naval-assets'] && <NavalAssetsOverlay navalAssets={navalAssets} />}
        {layers['commercial-shipping'] && <CommercialShippingOverlay vessels={vessels} />}
        {layers['strike-events'] && <StrikeAnimationOverlay events={strikeEvents} />}
      </MapContainer>

      <MapLayerControl
        layers={layers}
        onToggle={onToggleLayer}
        flightCount={flightCount}
        baseCount={militaryBases.length}
        navalCount={navalAssets.length}
        vesselCount={vesselCount}
        shippingLoading={shippingLoading}
        shippingError={shippingError}
        strikeCount={strikeEvents.length}
      />

      {layers['strike-events'] && (
        <StrikeAlertBanner
          events={strikeEvents}
          newEventIds={strikeNewEventIds}
          onClearNew={onClearStrikeNew}
        />
      )}

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
        flexWrap: 'wrap',
        gap: 6,
        fontSize: 9,
        color: '#666',
        maxWidth: 500,
      }}>
        {layers.flights && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2196f3', display: 'inline-block' }} />
              Airborne
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#666', display: 'inline-block' }} />
              Ground
            </span>
          </>
        )}
        {layers['military-bases'] && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
              US
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1565c0', display: 'inline-block' }} />
              NATO
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00bcd4', display: 'inline-block' }} />
              UK/FR
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2196f3', display: 'inline-block' }} />
              Israel
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e53935', display: 'inline-block' }} />
              China
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9c27b0', display: 'inline-block' }} />
              Russia
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f44336', display: 'inline-block' }} />
              Iran
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b71c1c', display: 'inline-block' }} />
              DPRK
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6f00', display: 'inline-block' }} />
              India
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c8a96e', display: 'inline-block' }} />
              Other
            </span>
          </>
        )}
        {layers['commercial-shipping'] && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff9800', display: 'inline-block' }} />
              Tanker
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9e9e9e', display: 'inline-block' }} />
              Cargo
            </span>
          </>
        )}
        {layers['strike-events'] && strikeEvents.length > 0 && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff3d00', display: 'inline-block' }} />
              Strike
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff1744', display: 'inline-block' }} />
              Impact
            </span>
          </>
        )}
      </div>

      <style>{`
        .leaflet-container {
          background: #0a0a0a !important;
          font-family: inherit !important;
        }
        .flight-marker-tooltip {
          background: rgba(0, 0, 0, 0.9) !important;
          border: 1px solid #333 !important;
          border-radius: 6px !important;
          padding: 0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          color: #fff !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }
        .flight-marker-tooltip::before {
          border-top-color: #333 !important;
        }
        .flight-tooltip {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 8px 10px;
          white-space: nowrap;
        }
        .flight-tooltip strong {
          font-size: 12px;
          font-weight: 700;
          color: #2196f3;
          letter-spacing: 0.5px;
        }
        .flight-tooltip span {
          color: #aaa;
          font-size: 10px;
        }
        .military-popup .leaflet-popup-content-wrapper {
          background: rgba(0, 0, 0, 0.92) !important;
          border: 1px solid #333 !important;
          border-radius: 8px !important;
          color: #fff !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
        }
        .military-popup .leaflet-popup-tip {
          background: rgba(0, 0, 0, 0.92) !important;
          border: 1px solid #333 !important;
        }
        .military-popup .leaflet-popup-close-button {
          color: #666 !important;
        }
        .military-popup .leaflet-popup-close-button:hover {
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
