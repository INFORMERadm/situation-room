import { useState, useEffect, useRef, useCallback } from 'react';
import type { VesselPosition } from '../types';

const POLL_INTERVAL = 15_000;
const VESSEL_STALE_MS = 120_000;

export function useCommercialShipping(active: boolean) {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vesselMapRef = useRef<Map<number, VesselPosition>>(new Map());
  const initialLoadRef = useRef(false);

  const fetchVessels = useCallback(async () => {
    if (!initialLoadRef.current) setLoading(true);
    setError(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=vessel-positions&duration=4`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const now = Date.now();
      const map = vesselMapRef.current;

      for (const v of (data.vessels || [])) {
        map.set(v.mmsi, v);
      }

      for (const [mmsi, v] of map) {
        if (now - v.timestamp > VESSEL_STALE_MS) {
          map.delete(mmsi);
        }
      }

      setVessels(Array.from(map.values()));
      initialLoadRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vessel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    fetchVessels();
    const interval = setInterval(fetchVessels, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [active, fetchVessels]);

  return { vessels, vesselCount: vessels.length, loading, error };
}
