/*
  # Create War Dashboard RPC Functions

  1. New Functions
    - `get_strike_summary` - Aggregates strike events by source country with totals
    - `get_infrastructure_summary` - Aggregates infrastructure by type and status
    - `get_strike_timeline` - Daily strike counts for the last 30 days

  2. Notes
    - These functions power the War Dashboard aggregated view
    - Read-only functions, no data modification
    - Accessible via supabase.rpc() calls
*/

CREATE OR REPLACE FUNCTION get_strike_summary()
RETURNS TABLE (
  source_country text,
  total_strikes bigint,
  total_projectiles bigint,
  unique_targets bigint,
  top_weapon text
) LANGUAGE sql STABLE AS $$
  SELECT
    source_country,
    COUNT(*) as total_strikes,
    COALESCE(SUM(projectile_count), 0) as total_projectiles,
    COUNT(DISTINCT target_label) as unique_targets,
    (
      SELECT se2.event_type
      FROM strike_events se2
      WHERE se2.source_country = se.source_country
      GROUP BY se2.event_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_weapon
  FROM strike_events se
  WHERE source_country IS NOT NULL AND source_country != ''
  GROUP BY source_country
  ORDER BY total_strikes DESC;
$$;

CREATE OR REPLACE FUNCTION get_infrastructure_summary()
RETURNS TABLE (
  infra_type text,
  status text,
  cnt bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    infra_type::text,
    status::text,
    COUNT(*) as cnt
  FROM critical_infrastructure
  GROUP BY infra_type, status
  ORDER BY infra_type, status;
$$;

CREATE OR REPLACE FUNCTION get_strike_timeline()
RETURNS TABLE (
  strike_date date,
  strike_count bigint,
  projectile_count bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    DATE(detected_at) as strike_date,
    COUNT(*) as strike_count,
    COALESCE(SUM(projectile_count), 0) as projectile_count
  FROM strike_events
  WHERE detected_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(detected_at)
  ORDER BY strike_date;
$$;
