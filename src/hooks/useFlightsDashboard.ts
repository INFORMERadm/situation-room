import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveFlights, fetchFlightDetails } from '../lib/api';
import type { LiveFlightPosition, FlightDetail } from '../types';

interface RawFlightData {
  fr24_id?: string;
  flight?: string;
  callsign?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  gspd?: number;
  track?: number;
  vspd?: number;
  reg?: string;
  type?: string;
  airline_name?: string;
  airline_icao?: string;
  orig_iata?: string;
  orig_name?: string;
  dest_iata?: string;
  dest_name?: string;
  squawk?: string;
  gnd?: boolean | number | string;
  t?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  ground_speed?: number;
  heading?: number;
  vertical_speed?: number;
  registration?: string;
  aircraft_type?: string;
  origin_airport_iata?: string;
  destination_airport_iata?: string;
  on_ground?: boolean;
  timestamp?: number;
  [key: string]: unknown;
}

function normalizeFlight(raw: RawFlightData, idx: number): LiveFlightPosition {
  return {
    flightId: String(raw.fr24_id ?? raw.flight ?? `fl-${idx}`),
    callsign: String(raw.callsign ?? raw.flight ?? ''),
    registration: String(raw.reg ?? raw.registration ?? ''),
    aircraftType: String(raw.type ?? raw.aircraft_type ?? ''),
    airlineName: String(raw.airline_name ?? ''),
    airlineIcao: String(raw.airline_icao ?? ''),
    latitude: Number(raw.lat ?? raw.latitude ?? 0),
    longitude: Number(raw.lon ?? raw.longitude ?? 0),
    altitude: Number(raw.alt ?? raw.altitude ?? 0),
    groundSpeed: Number(raw.gspd ?? raw.ground_speed ?? 0),
    heading: Number(raw.track ?? raw.heading ?? 0),
    verticalSpeed: Number(raw.vspd ?? raw.vertical_speed ?? 0),
    originIata: String(raw.orig_iata ?? raw.origin_airport_iata ?? ''),
    originName: String(raw.orig_name ?? ''),
    destinationIata: String(raw.dest_iata ?? raw.destination_airport_iata ?? ''),
    destinationName: String(raw.dest_name ?? ''),
    flightNumber: String(raw.flight ?? raw.callsign ?? ''),
    squawk: String(raw.squawk ?? ''),
    isOnGround: Boolean(raw.gnd ?? raw.on_ground ?? false),
    timestamp: Number(raw.t ?? raw.timestamp ?? Date.now() / 1000),
  };
}

const POLL_INTERVAL = 8000;

export function useFlightsDashboard(active: boolean) {
  const [flights, setFlights] = useState<LiveFlightPosition[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetail | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [hoveredFlight, setHoveredFlight] = useState<LiveFlightPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const loadFlights = useCallback(async () => {
    try {
      const raw = await fetchLiveFlights();
      if (!mountedRef.current) return;
      const list = Array.isArray(raw)
        ? raw.map((f: RawFlightData, i: number) => normalizeFlight(f, i))
            .filter((f: LiveFlightPosition) => f.latitude !== 0 || f.longitude !== 0)
        : [];
      setFlights(list);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load flights');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setLoading(true);
    loadFlights();
    intervalRef.current = setInterval(loadFlights, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, loadFlights]);

  const selectFlight = useCallback(async (flightId: string) => {
    setSelectedFlightId(flightId);
    setDetailLoading(true);
    try {
      const detail = await fetchFlightDetails(flightId);
      if (mountedRef.current) {
        setSelectedFlight(detail);
      }
    } catch {
      if (mountedRef.current) setSelectedFlight(null);
    } finally {
      if (mountedRef.current) setDetailLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFlight(null);
    setSelectedFlightId(null);
  }, []);

  const hoverFlight = useCallback((flight: LiveFlightPosition | null) => {
    setHoveredFlight(flight);
  }, []);

  return {
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
  };
}
