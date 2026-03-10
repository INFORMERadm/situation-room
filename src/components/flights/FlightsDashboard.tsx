import { useCallback, useEffect, useRef } from 'react';
import FlightMap from './FlightMap';
import FlightDetailPanel from './FlightDetailPanel';
import FlightSearchPanel from './FlightSearchPanel';
import { useFlightsDashboard } from '../../hooks/useFlightsDashboard';
import { useFlightInterpolation } from '../../hooks/useFlightInterpolation';
import useFlightSearch from '../../hooks/useFlightSearch';
import { useMilitaryOverlay } from '../../hooks/useMilitaryOverlay';
import { useCommercialShipping } from '../../hooks/useCommercialShipping';
import { useStrikeEvents } from '../../hooks/useStrikeEvents';
import { useMapLayers } from '../../hooks/useMapLayers';
import { playStrikeAlarm } from '../../lib/alarmSound';
import LiveCamButton from './LiveCamButton';
import type { LiveFlightPosition } from '../../types';

interface FlightsDashboardProps {
  active: boolean;
}

export default function FlightsDashboard({ active }: FlightsDashboardProps) {
  const {
    flights,
    selectedFlight,
    selectedFlightId,
    loading,
    error,
    detailLoading,
    selectFlight,
    clearSelection,
  } = useFlightsDashboard(active);

  const interpolatedFlights = useFlightInterpolation(flights);
  const search = useFlightSearch();
  const { layers, toggleLayer, isLayerVisible } = useMapLayers();
  const military = useMilitaryOverlay(active);
  const shipping = useCommercialShipping(active && isLayerVisible('commercial-shipping'));
  const strikes = useStrikeEvents(active && isLayerVisible('strike-events'));
  const alarmPlayedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (strikes.newEventIds.size > 0) {
      let played = false;
      for (const id of strikes.newEventIds) {
        if (!alarmPlayedRef.current.has(id)) {
          alarmPlayedRef.current.add(id);
          if (!played) {
            playStrikeAlarm();
            played = true;
          }
        }
      }
    }
  }, [strikes.newEventIds]);

  const handleSelectFlight = useCallback((flight: LiveFlightPosition) => {
    selectFlight(flight.flightId);
  }, [selectFlight]);

  const liveFlight = selectedFlightId
    ? interpolatedFlights.find(f => f.flightId === selectedFlightId) ?? null
    : null;

  if (!active) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <FlightMap
        flights={interpolatedFlights}
        selectedFlightId={selectedFlightId}
        loading={loading}
        error={error}
        onSelectFlight={handleSelectFlight}
        activeTrack={search.activeTrack}
        militaryBases={military.bases}
        navalAssets={military.navalAssets}
        vessels={shipping.vessels}
        layers={layers}
        onToggleLayer={toggleLayer}
        vesselCount={shipping.vesselCount}
        shippingLoading={shipping.loading}
        shippingError={shipping.error}
        strikeEvents={strikes.events}
        strikeNewEventIds={strikes.newEventIds}
        onClearStrikeNew={strikes.clearNewEvents}
      />
      <FlightSearchPanel
        isOpen={search.isOpen}
        mode={search.mode}
        loading={search.loading}
        error={search.error}
        results={search.results}
        activeTrack={search.activeTrack}
        onToggle={search.togglePanel}
        onSetMode={search.setMode}
        onClearResults={search.clearResults}
        onClearTrack={search.clearTrack}
        onSearchInterval={search.searchFlightsInInterval}
        onSearchAircraft={search.searchFlightsByAircraft}
        onSearchArrivals={search.searchArrivalsByAirport}
        onSearchDepartures={search.searchDeparturesByAirport}
        onSearchTrack={search.searchAircraftTrack}
      />
      <LiveCamButton />
      {selectedFlightId && (
        <FlightDetailPanel
          detail={selectedFlight}
          liveFlight={liveFlight}
          loading={detailLoading}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
