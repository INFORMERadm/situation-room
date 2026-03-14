/*
  # Create vessel cache table

  1. New Tables
    - `vessel_cache`
      - `id` (integer, primary key, constrained to 1 -- single-row cache pattern)
      - `vessels_data` (jsonb, stores array of vessel position objects)
      - `vessel_count` (integer, number of vessels in cache)
      - `last_zones_queried` (jsonb, tracks which zone IDs were fetched in the last cycle)
      - `next_rotation_index` (integer, index for rotating through lower-priority zones)
      - `credits_used_total` (integer, running total of API credits consumed)
      - `fetched_at` (timestamptz, when the cache was last refreshed)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled but no user-facing policies needed
    - Only accessed by edge functions via service role key

  3. Notes
    - Single-row pattern (same as live_flights_cache) ensures atomic reads/writes
    - Edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
*/

CREATE TABLE IF NOT EXISTS vessel_cache (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vessels_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  vessel_count integer NOT NULL DEFAULT 0,
  last_zones_queried jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_rotation_index integer NOT NULL DEFAULT 0,
  credits_used_total integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vessel_cache ENABLE ROW LEVEL SECURITY;

INSERT INTO vessel_cache (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
