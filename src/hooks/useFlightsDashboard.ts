import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveFlights } from '../lib/api';
import type { LiveFlightPosition, FlightDetail } from '../types';

interface RawFlightData {
  icao24?: string;
  callsign?: string;
  origin_country?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  gspd?: number;
  track?: number;
  vspd?: number;
  on_ground?: boolean;
  squawk?: string;
  baro_alt?: number;
  geo_alt?: number;
  last_contact?: number;
  category?: number;
  [key: string]: unknown;
}

function normalizeFlight(raw: RawFlightData, idx: number): LiveFlightPosition {
  const alt = Number(raw.alt ?? 0);
  const callsign = String(raw.callsign ?? '').trim();
  return {
    flightId: String(raw.icao24 ?? `fl-${idx}`),
    callsign,
    registration: '',
    aircraftType: '',
    airlineName: String(raw.origin_country ?? ''),
    airlineIcao: '',
    latitude: Number(raw.lat ?? 0),
    longitude: Number(raw.lon ?? 0),
    altitude: alt,
    groundSpeed: Number(raw.gspd ?? 0),
    heading: Number(raw.track ?? 0),
    verticalSpeed: Number(raw.vspd ?? 0),
    originIata: '',
    originName: '',
    destinationIata: '',
    destinationName: '',
    flightNumber: callsign,
    squawk: String(raw.squawk ?? ''),
    isOnGround: raw.on_ground ?? alt === 0,
    timestamp: raw.last_contact ?? Date.now() / 1000,
  };
}

const POLL_INTERVAL = 30000;

export function useFlightsDashboard(active: boolean) {
  const [flights, setFlights] = useState<LiveFlightPosition[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetail | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
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
      setFlights(prev => {
        if (prev.length === 0) {
          setError(err instanceof Error ? err.message : 'Failed to load flights');
        }
        return prev;
      });
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

  const selectFlight = useCallback((flightId: string) => {
    setSelectedFlightId(flightId);
    const live = flights.find(f => f.flightId === flightId);

    const baseFlight: FlightDetail = {
      flightId,
      callsign: live?.callsign || '',
      flightNumber: live?.flightNumber || live?.callsign || '',
      registration: '',
      aircraftType: '',
      operatingAs: '',
      paintedAs: '',
      originIata: '',
      originIcao: '',
      originName: '',
      originCity: '',
      originCountry: live?.airlineName || '',
      originTimezone: '',
      destinationIata: '',
      destinationIcao: '',
      destinationName: '',
      destinationCity: '',
      destinationCountry: '',
      destinationTimezone: '',
      departureTime: '',
      arrivalTime: '',
      flightTime: null,
      actualDistance: null,
      circleDistance: null,
      category: '',
      status: live?.isOnGround ? 'On Ground' : 'In Flight',
      origin: null,
      destination: null,
    };
    setSelectedFlight(baseFlight);

    setDetailLoading(false);
  }, [flights]);

  const clearSelection = useCallback(() => {
    setSelectedFlight(null);
    setSelectedFlightId(null);
  }, []);

  return {
    flights,
    selectedFlight,
    selectedFlightId,
    loading,
    error,
    detailLoading,
    selectFlight,
    clearSelection,
  };
}
