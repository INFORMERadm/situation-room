import { useState, useEffect, useCallback } from 'react';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker`;

export interface StrikeCountrySummary {
  source_country: string;
  total_strikes: number;
  total_projectiles: number;
  unique_targets: number;
  top_weapon: string;
}

export interface InfraTypeSummary {
  infra_type: string;
  status: string;
  cnt: number;
}

export interface NavalAssetSummary {
  name: string;
  asset_type: string;
  operator: string;
  hull_number: string;
  class_name: string;
  region: string;
  status: string;
  last_reported_date: string;
  latitude: number;
  longitude: number;
  heading: number;
}

export interface TimelinePoint {
  strike_date: string;
  strike_count: number;
  projectile_count: number;
}

export interface WarDashboardSummary {
  totalStrikes: number;
  totalProjectiles: number;
  uniqueTargets: number;
  infraDamaged: number;
  infraDestroyed: number;
  infraIntact: number;
  infraTotal: number;
  navalVessels: number;
  militaryBases: number;
}

export interface WarDashboardData {
  summary: WarDashboardSummary;
  strikesByCountry: StrikeCountrySummary[];
  infraByTypeStatus: InfraTypeSummary[];
  navalAssets: NavalAssetSummary[];
  navalByOperator: Record<string, { count: number; types: Record<string, number> }>;
  basesByOperator: Record<string, number>;
  timeline: TimelinePoint[];
}

export function useWarDashboard(active: boolean) {
  const [data, setData] = useState<WarDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}?feed=war-dashboard`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
