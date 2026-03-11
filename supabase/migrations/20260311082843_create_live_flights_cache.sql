/*
  # Create live flights cache table

  1. New Tables
    - `live_flights_cache`
      - `id` (integer, primary key, single-row pattern with value 1)
      - `flights_data` (jsonb) - cached flight state vectors
      - `flight_count` (integer) - number of flights in cache
      - `fetched_at` (timestamptz) - when the data was fetched from OpenSky
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Service role only (no user policies needed - only edge functions access this)

  3. Notes
    - Single-row cache pattern: always upsert id=1
    - Edge function reads/writes via service role key
    - Prevents OpenSky 429 rate limiting by sharing cache across all requests
*/

CREATE TABLE IF NOT EXISTS live_flights_cache (
  id integer PRIMARY KEY DEFAULT 1,
  flights_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  flight_count integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE live_flights_cache ENABLE ROW LEVEL SECURITY;

INSERT INTO live_flights_cache (id, flights_data, flight_count, fetched_at)
VALUES (1, '[]'::jsonb, 0, now())
ON CONFLICT (id) DO NOTHING;
