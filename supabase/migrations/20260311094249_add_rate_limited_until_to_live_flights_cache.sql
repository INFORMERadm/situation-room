/*
  # Add rate_limited_until column to live_flights_cache

  1. Modified Tables
    - `live_flights_cache`
      - Added `rate_limited_until` (timestamptz, nullable) - tracks when the OpenSky rate limit cooldown expires
  
  2. Purpose
    - Persists 429 rate limit state across edge function cold starts
    - Edge function checks this before calling OpenSky API
    - Prevents wasting API credits on requests that will definitely fail
    - Set to NULL when no rate limit is active
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_flights_cache' AND column_name = 'rate_limited_until'
  ) THEN
    ALTER TABLE live_flights_cache ADD COLUMN rate_limited_until timestamptz DEFAULT NULL;
  END IF;
END $$;
