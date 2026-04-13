import { useCallback, useEffect, useRef, useState } from 'react';
import FlightMap from './FlightMap';
import FlightDetailPanel from './FlightDetailPanel';
import FlightSearchPanel from './FlightSearchPanel';
import WarDashboard from './WarDashboard';
import { useFlightsDashboard } from '../../hooks/useFlightsDashboard';
import { useFlightInterpolation } from '../../hooks/useFlightInterpolation';
import useFlightSearch from '../../hooks/useFlightSearch';
import { useMilitaryOverlay } from '../../hooks/useMilitaryOverlay';
import { useStrikeEvents } from '../../hooks/useStrikeEvents';
import { useMapLayers } from '../../hooks/useMapLayers';
import { useCriticalInfrastructure } from '../../hooks/useCriticalInfrastructure';
import { playStrikeAlarm } from '../../lib/alarmSound';
import LiveCamButton from './LiveCamButton';
import type { LiveFlightPosition } from '../../types';

interface FlightsDashboardProps {
  active: boolean;
}

export default function FlightsDashboard({ active }: FlightsDashboardProps) {
  const [showWarDashboard, setShowWarDashboard] = useState(false);
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
  const strikes = useStrikeEvents(active && isLayerVisible('strike-events'));
  const { infrastructure } = useCriticalInfrastructure(active && isLayerVisible('critical-infrastructure'));
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
        layers={layers}
        onToggleLayer={toggleLayer}
        strikeEvents={strikes.events}
        strikeNewEventIds={strikes.newEventIds}
        onClearStrikeNew={strikes.clearNewEvents}
        criticalInfrastructure={infrastructure}
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
      <button
        onClick={() => setShowWarDashboard(true)}
        style={{
          position: 'absolute',
          bottom: 14,
          right: 130,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          letterSpacing: 0.5,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,23,68,0.3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.75)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff1744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        WAR DASHBOARD
      </button>
      {showWarDashboard && <WarDashboard onClose={() => setShowWarDashboard(false)} />}
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
