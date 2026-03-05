import { useCallback } from 'react';
import FlightMap from './FlightMap';
import FlightDetailPanel from './FlightDetailPanel';
import { useFlightsDashboard } from '../../hooks/useFlightsDashboard';
import { useFlightInterpolation } from '../../hooks/useFlightInterpolation';
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
      />
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
