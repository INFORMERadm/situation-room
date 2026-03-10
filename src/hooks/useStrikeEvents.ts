import { useState, useEffect, useRef, useCallback } from 'react';
import type { StrikeEvent } from '../types';

const POLL_INTERVAL = 20_000;
const DETECT_INTERVAL = 90_000;

export function useStrikeEvents(active: boolean) {
  const [events, setEvents] = useState<StrikeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=strike-events`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched: StrikeEvent[] = data.events || [];

      const freshIds = new Set<string>();
      for (const ev of fetched) {
        if (!prevIdsRef.current.has(ev.id)) {
          freshIds.add(ev.id);
        }
      }

      prevIdsRef.current = new Set(fetched.map((e) => e.id));
      if (freshIds.size > 0) setNewEventIds(freshIds);
      setEvents(fetched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load strike events');
    }
  }, []);

  const triggerDetection = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strike-detector`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // detection failures are non-critical
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      await triggerDetection();
      if (!cancelled) await fetchEvents();
      if (!cancelled) setLoading(false);
    };

    init();

    const pollInterval = setInterval(() => {
      if (!cancelled) fetchEvents();
    }, POLL_INTERVAL);

    const detectInterval = setInterval(() => {
      if (!cancelled) triggerDetection();
    }, DETECT_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearInterval(detectInterval);
    };
  }, [active, fetchEvents, triggerDetection]);

  const clearNewEvents = useCallback(() => {
    setNewEventIds(new Set());
  }, []);

  return { events, loading, error, newEventIds, clearNewEvents };
}
