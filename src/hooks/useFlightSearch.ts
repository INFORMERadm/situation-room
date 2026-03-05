import { useState, useCallback } from 'react';
import type { OpenSkyFlight, AircraftTrack, FlightSearchMode } from '../types';
import {
  fetchFlightsInInterval,
  fetchFlightsByAircraft,
  fetchArrivalsByAirport,
  fetchDeparturesByAirport,
  fetchAircraftTrack,
} from '../lib/api';

interface FlightSearchState {
  isOpen: boolean;
  mode: FlightSearchMode;
  loading: boolean;
  error: string | null;
  results: OpenSkyFlight[];
  activeTrack: AircraftTrack | null;
}

const MAX_INTERVAL_SECONDS = 7200;
const MAX_AIRCRAFT_SECONDS = 172800;
const MAX_AIRPORT_SECONDS = 604800;

export default function useFlightSearch() {
  const [state, setState] = useState<FlightSearchState>({
    isOpen: false,
    mode: 'flights-aircraft',
    loading: false,
    error: null,
    results: [],
    activeTrack: null,
  });

  const togglePanel = useCallback(() => {
    setState(s => ({ ...s, isOpen: !s.isOpen }));
  }, []);

  const setMode = useCallback((mode: FlightSearchMode) => {
    setState(s => ({ ...s, mode, results: [], activeTrack: null, error: null }));
  }, []);

  const clearResults = useCallback(() => {
    setState(s => ({ ...s, results: [], activeTrack: null, error: null }));
  }, []);

  const clearTrack = useCallback(() => {
    setState(s => ({ ...s, activeTrack: null }));
  }, []);

  const searchFlightsInInterval = useCallback(async (begin: number, end: number) => {
    if (end <= begin) {
      setState(s => ({ ...s, error: 'End time must be after start time' }));
      return;
    }
    if (end - begin > MAX_INTERVAL_SECONDS) {
      setState(s => ({ ...s, error: 'Time interval must not exceed 2 hours' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null, results: [], activeTrack: null }));
    try {
      const results = await fetchFlightsInInterval(begin, end);
      setState(s => ({ ...s, loading: false, results }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Search failed' }));
    }
  }, []);

  const searchFlightsByAircraft = useCallback(async (icao24: string, begin: number, end: number) => {
    if (!icao24.trim()) {
      setState(s => ({ ...s, error: 'ICAO24 address is required' }));
      return;
    }
    if (end <= begin) {
      setState(s => ({ ...s, error: 'End time must be after start time' }));
      return;
    }
    if (end - begin > MAX_AIRCRAFT_SECONDS) {
      setState(s => ({ ...s, error: 'Time interval must not exceed 2 days' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null, results: [], activeTrack: null }));
    try {
      const results = await fetchFlightsByAircraft(icao24.trim().toLowerCase(), begin, end);
      setState(s => ({ ...s, loading: false, results }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Search failed' }));
    }
  }, []);

  const searchArrivalsByAirport = useCallback(async (airport: string, begin: number, end: number) => {
    if (!airport.trim()) {
      setState(s => ({ ...s, error: 'Airport ICAO code is required' }));
      return;
    }
    if (end <= begin) {
      setState(s => ({ ...s, error: 'End time must be after start time' }));
      return;
    }
    if (end - begin > MAX_AIRPORT_SECONDS) {
      setState(s => ({ ...s, error: 'Time interval must not exceed 7 days' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null, results: [], activeTrack: null }));
    try {
      const results = await fetchArrivalsByAirport(airport.trim().toUpperCase(), begin, end);
      setState(s => ({ ...s, loading: false, results }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Search failed' }));
    }
  }, []);

  const searchDeparturesByAirport = useCallback(async (airport: string, begin: number, end: number) => {
    if (!airport.trim()) {
      setState(s => ({ ...s, error: 'Airport ICAO code is required' }));
      return;
    }
    if (end <= begin) {
      setState(s => ({ ...s, error: 'End time must be after start time' }));
      return;
    }
    if (end - begin > MAX_AIRPORT_SECONDS) {
      setState(s => ({ ...s, error: 'Time interval must not exceed 7 days' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null, results: [], activeTrack: null }));
    try {
      const results = await fetchDeparturesByAirport(airport.trim().toUpperCase(), begin, end);
      setState(s => ({ ...s, loading: false, results }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Search failed' }));
    }
  }, []);

  const searchAircraftTrack = useCallback(async (icao24: string, time?: number) => {
    if (!icao24.trim()) {
      setState(s => ({ ...s, error: 'ICAO24 address is required' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null, results: [], activeTrack: null }));
    try {
      const track = await fetchAircraftTrack(icao24.trim().toLowerCase(), time);
      if (!track) {
        setState(s => ({ ...s, loading: false, error: 'No track data found for this aircraft' }));
        return;
      }
      setState(s => ({ ...s, loading: false, activeTrack: track }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Track search failed' }));
    }
  }, []);

  return {
    ...state,
    togglePanel,
    setMode,
    clearResults,
    clearTrack,
    searchFlightsInInterval,
    searchFlightsByAircraft,
    searchArrivalsByAirport,
    searchDeparturesByAirport,
    searchAircraftTrack,
  };
}
