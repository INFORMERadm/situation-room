import { useState, useEffect, useRef, useCallback } from 'react';
import type { VesselPosition } from '../types';

const POLL_INTERVAL = 20_000;
const VESSEL_STALE_MS = 180_000;
const FETCH_TIMEOUT = 15_000;

export function useCommercialShipping(active: boolean) {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vesselMapRef = useRef<Map<number, VesselPosition>>(new Map());
  const initialLoadRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchVessels = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!initialLoadRef.current) setLoading(true);
    setError(null);

    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=vessel-positions&duration=4`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const now = Date.now();
      const map = vesselMapRef.current;

      for (const v of (data.vessels || [])) {
        map.set(v.mmsi, { ...v, timestamp: v.timestamp || now });
      }

      for (const [mmsi, v] of map) {
        if (now - v.timestamp > VESSEL_STALE_MS) {
          map.delete(mmsi);
        }
      }

      setVessels(Array.from(map.values()));
      initialLoadRef.current = true;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') return;
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
      if (abortRef.current) abortRef.current.abort();
    };
  }, [active, fetchVessels]);

  return { vessels, vesselCount: vessels.length, loading, error };
}
