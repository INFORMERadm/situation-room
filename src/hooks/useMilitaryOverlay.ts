import { useState, useEffect, useRef } from 'react';
import type { MilitaryBase, MilitaryNavalAsset } from '../types';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useMilitaryOverlay(active: boolean) {
  const [bases, setBases] = useState<MilitaryBase[]>([]);
  const [navalAssets, setNavalAssets] = useState<MilitaryNavalAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const fetchData = async () => {
      if (!fetchedRef.current) setLoading(true);
      setError(null);

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=military-data`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!cancelled) {
          setBases(data.bases || []);
          setNavalAssets(data.navalAssets || []);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load military data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active]);

  return { bases, navalAssets, loading, error };
}
