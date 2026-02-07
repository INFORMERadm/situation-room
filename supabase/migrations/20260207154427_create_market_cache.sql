/*
  # Create market_cache table

  1. New Tables
    - `market_cache`
      - `cache_key` (text, primary key) - identifies the cached data set (e.g. "markets", "quote:AAPL")
      - `data` (jsonb) - the cached API response payload
      - `updated_at` (timestamptz) - when the cache entry was last refreshed

  2. Security
    - Enable RLS on `market_cache` table
    - Add read-only policy for authenticated users
    - Edge function uses service role key to bypass RLS for writes

  3. Notes
    - This table acts as a server-side cache to avoid exhausting FMP API rate limits
    - The edge function checks updated_at before making fresh API calls
    - Stale entries (older than 2 minutes) trigger a fresh fetch
*/

CREATE TABLE IF NOT EXISTS market_cache (
  cache_key text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
  ON market_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
