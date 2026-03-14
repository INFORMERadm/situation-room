import { useState, useEffect, useRef, useCallback } from 'react';
import type { VesselPosition } from '../types';

const BASE_POLL_INTERVAL = 120_000;
const MAX_POLL_INTERVAL = 300_000;
const VESSELS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=vessels`;

const AUTH_HEADERS = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export function useCommercialShipping(active: boolean) {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const consecutiveFailsRef = useRef(0);
  const mountedRef = useRef(false);

  const getInterval = useCallback(() => {
    const fails = consecutiveFailsRef.current;
    if (fails === 0) return BASE_POLL_INTERVAL;
    return Math.min(BASE_POLL_INTERVAL * Math.pow(2, fails), MAX_POLL_INTERVAL);
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchVessels, getInterval());
  }, [getInterval]);

  const fetchVessels = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (vessels.length === 0) setLoading(true);

      const res = await fetch(VESSELS_URL, {
        headers: AUTH_HEADERS,
        signal: controller.signal,
      });

      if (!mountedRef.current) return;

      if (!res.ok) {
        consecutiveFailsRef.current++;
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Vessel data unavailable');
        setLoading(false);
        scheduleNext();
        return;
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      if (data.vessels && Array.isArray(data.vessels)) {
        setVessels(data.vessels);
        consecutiveFailsRef.current = 0;
        setError(null);
      } else {
        consecutiveFailsRef.current++;
        setError('Vessel data unavailable');
      }
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      consecutiveFailsRef.current++;
      setLoading(false);
      setError('Vessel data unavailable');
    }
    scheduleNext();
  }, [vessels.length, scheduleNext]);

  useEffect(() => {
    if (!active) {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
      mountedRef.current = false;
      return;
    }

    mountedRef.current = true;
    consecutiveFailsRef.current = 0;
    fetchVessels();

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [active]);

  return { vessels, vesselCount: vessels.length, loading, error };
}
