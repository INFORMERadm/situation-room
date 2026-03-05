import { useCallback } from 'react';
import FlightMap from './FlightMap';
import FlightDetailPanel from './FlightDetailPanel';
import { useFlightsDashboard } from '../../hooks/useFlightsDashboard';
import type { LiveFlightPosition } from '../../types';

interface FlightsDashboardProps {
  active: boolean;
}

export default function FlightsDashboard({ active }: FlightsDashboardProps) {
  const {
    flights,
    selectedFlight,
    selectedFlightId,
    hoveredFlight,
    loading,
    error,
    detailLoading,
    selectFlight,
    clearSelection,
    hoverFlight,
  } = useFlightsDashboard(active);

  const handleSelectFlight = useCallback((flight: LiveFlightPosition) => {
    selectFlight(flight.flightId);
  }, [selectFlight]);

  const liveFlight = selectedFlightId
    ? flights.find(f => f.flightId === selectedFlightId) ?? null
    : null;

  if (!active) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <FlightMap
        flights={flights}
        selectedFlightId={selectedFlightId}
        loading={loading}
        error={error}
        onSelectFlight={handleSelectFlight}
        onHoverFlight={hoverFlight}
      />
      {(selectedFlightId || hoveredFlight) && (
        <FlightDetailPanel
          detail={selectedFlight}
          liveFlight={liveFlight ?? hoveredFlight}
          loading={detailLoading}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
