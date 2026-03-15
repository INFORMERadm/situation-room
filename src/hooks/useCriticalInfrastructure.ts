import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { CriticalInfrastructure } from '../types';

const REFRESH_INTERVAL = 10 * 60 * 1000;

export function useCriticalInfrastructure(active: boolean) {
  const [infrastructure, setInfrastructure] = useState<CriticalInfrastructure[]>([]);
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
        const { data, error: sbError } = await supabase
          .from('critical_infrastructure')
          .select('*')
          .order('name');

        if (sbError) throw new Error(sbError.message);

        if (!cancelled) {
          setInfrastructure(data || []);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load infrastructure data');
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

  return { infrastructure, loading, error };
}
