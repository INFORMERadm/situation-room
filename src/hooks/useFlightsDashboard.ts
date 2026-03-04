import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveFlights, fetchFlightDetail } from '../lib/api';
import type { LiveFlight, FlightDetail } from '../types';

const POLL_INTERVAL = 10000;

interface MapBounds {
  lamin: number;
  lamax: number;
  lomin: number;
  lomax: number;
}

const DEFAULT_BOUNDS: MapBounds = { lamin: -90, lamax: 90, lomin: -180, lomax: 180 };

export interface FlightsDashboardState {
  flights: LiveFlight[];
  selectedFlight: FlightDetail | null;
  selectedFlightId: string | null;
  loading: boolean;
  detailLoading: boolean;
  flightCount: number;
  searchQuery: string;
  filteredFlights: LiveFlight[];
  setBounds: (bounds: MapBounds) => void;
  selectFlight: (flightId: string) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
}

export function useFlightsDashboard(): FlightsDashboardState {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetail | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const loadFlights = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchLiveFlights(boundsRef.current);
      setFlights(data);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlights();
    const interval = setInterval(loadFlights, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadFlights]);

  useEffect(() => {
    loadFlights();
  }, [bounds, loadFlights]);

  const selectFlight = useCallback(async (flightId: string) => {
    setSelectedFlightId(flightId);
    setDetailLoading(true);
    try {
      const detail = await fetchFlightDetail(flightId);
      setSelectedFlight(detail);
    } catch {
      setSelectedFlight(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFlightId(null);
    setSelectedFlight(null);
  }, []);

  const filteredFlights = searchQuery.trim()
    ? flights.filter(f => {
        const q = searchQuery.toLowerCase();
        return (
          f.callsign.toLowerCase().includes(q) ||
          f.flightNumber.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          f.origin.toLowerCase().includes(q) ||
          f.destination.toLowerCase().includes(q) ||
          f.registration.toLowerCase().includes(q)
        );
      })
    : flights;

  return {
    flights,
    selectedFlight,
    selectedFlightId,
    loading,
    detailLoading,
    flightCount: flights.length,
    searchQuery,
    filteredFlights,
    setBounds,
    selectFlight,
    clearSelection,
    setSearchQuery,
  };
}
