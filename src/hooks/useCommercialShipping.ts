import { useState, useEffect, useRef } from 'react';
import type { VesselPosition } from '../types';

const POLL_INTERVAL = 30_000;
const VESSELS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=vessels`;

const AUTH_HEADERS = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export function useCommercialShipping(active: boolean) {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current);
      abortRef.current?.abort();
      return;
    }

    let mounted = true;

    async function fetchVessels() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(prev => vessels.length === 0 ? true : prev);

        const res = await fetch(VESSELS_URL, {
          headers: AUTH_HEADERS,
          signal: controller.signal,
        });

        if (!mounted) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!mounted) return;

        if (data.vessels && Array.isArray(data.vessels)) {
          setVessels(data.vessels);
          setError(data.wsConnected ? null : 'AIS stream reconnecting...');
        } else {
          setError(data.error || 'Invalid response');
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to fetch vessels');
      }
    }

    fetchVessels();
    timerRef.current = setInterval(fetchVessels, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [active]);

  return { vessels, vesselCount: vessels.length, loading, error };
}
