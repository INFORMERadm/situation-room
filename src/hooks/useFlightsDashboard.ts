import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveFlights, fetchFlightDetail, fetchFlightTracks } from '../lib/api';
import type { LiveFlight, FlightDetail, FlightTrackPoint } from '../types';

const POLL_INTERVAL = 8000;
const DEFAULT_BOUNDS = '72,-65,-180,180';

export interface FlightsDashboardState {
  flights: LiveFlight[];
  selectedFlight: FlightDetail | null;
  selectedFlightId: string | null;
  flightTracks: FlightTrackPoint[];
  bounds: string;
  loading: boolean;
  detailLoading: boolean;
  flightCount: number;
  searchQuery: string;
  filteredFlights: LiveFlight[];
  setBounds: (bounds: string) => void;
  selectFlight: (flightId: string) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
}

export function useFlightsDashboard(): FlightsDashboardState {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetail | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [flightTracks, setFlightTracks] = useState<FlightTrackPoint[]>([]);
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
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
      const [detail, tracks] = await Promise.all([
        fetchFlightDetail(flightId),
        fetchFlightTracks(flightId),
      ]);
      setSelectedFlight(detail);
      setFlightTracks(tracks);
    } catch {
      setSelectedFlight(null);
      setFlightTracks([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFlightId(null);
    setSelectedFlight(null);
    setFlightTracks([]);
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
    flightTracks,
    bounds,
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
