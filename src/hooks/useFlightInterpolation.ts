import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveFlightPosition } from '../types';

const EARTH_RADIUS_KM = 6371;
const KTS_TO_KMH = 1.852;
const KMH_TO_DEG_LAT = 1 / (EARTH_RADIUS_KM * (Math.PI / 180));

function interpolatePosition(
  lat: number,
  lon: number,
  heading: number,
  groundSpeedKts: number,
  dtSeconds: number,
): { lat: number; lon: number } {
  if (groundSpeedKts < 5) return { lat, lon };

  const speedKmh = groundSpeedKts * KTS_TO_KMH;
  const distKm = (speedKmh / 3600) * dtSeconds;

  const headingRad = (heading * Math.PI) / 180;
  const dLat = distKm * Math.cos(headingRad) * KMH_TO_DEG_LAT;
  const dLon =
    (distKm * Math.sin(headingRad) * KMH_TO_DEG_LAT) /
    Math.cos((lat * Math.PI) / 180);

  return {
    lat: lat + dLat,
    lon: lon + dLon,
  };
}

interface FlightSnapshot {
  lat: number;
  lon: number;
  heading: number;
  groundSpeed: number;
  isOnGround: boolean;
  receivedAt: number;
}

export function useFlightInterpolation(flights: LiveFlightPosition[]): LiveFlightPosition[] {
  const snapshotsRef = useRef<Map<string, FlightSnapshot>>(new Map());
  const [interpolated, setInterpolated] = useState<LiveFlightPosition[]>(flights);
  const rafRef = useRef<number>(0);
  const flightsRef = useRef(flights);

  useEffect(() => {
    flightsRef.current = flights;
    const now = performance.now();
    const newSnapshots = new Map<string, FlightSnapshot>();

    for (const f of flights) {
      newSnapshots.set(f.flightId, {
        lat: f.latitude,
        lon: f.longitude,
        heading: f.heading,
        groundSpeed: f.groundSpeed,
        isOnGround: f.isOnGround,
        receivedAt: now,
      });
    }

    snapshotsRef.current = newSnapshots;
  }, [flights]);

  const tick = useCallback(() => {
    const now = performance.now();
    const snapshots = snapshotsRef.current;
    const currentFlights = flightsRef.current;

    const result = currentFlights.map((f) => {
      const snap = snapshots.get(f.flightId);
      if (!snap || snap.isOnGround || snap.groundSpeed < 5) return f;

      const dtSeconds = (now - snap.receivedAt) / 1000;
      if (dtSeconds < 0.05 || dtSeconds > 30) return f;

      const pos = interpolatePosition(
        snap.lat,
        snap.lon,
        snap.heading,
        snap.groundSpeed,
        dtSeconds,
      );

      return {
        ...f,
        latitude: pos.lat,
        longitude: pos.lon,
      };
    });

    setInterpolated(result);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return interpolated;
}
