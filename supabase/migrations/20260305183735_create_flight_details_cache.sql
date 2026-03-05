/*
  # Create flight details cache table

  1. New Tables
    - `flight_details_cache`
      - `callsign` (text, primary key) - Aircraft callsign used as lookup key
      - `icao24` (text) - ICAO 24-bit hex transponder address
      - `fr24_id` (text) - Flightradar24 internal flight ID
      - `flight` (text) - IATA flight number
      - `aircraft_type` (text) - ICAO aircraft type code
      - `registration` (text) - Aircraft registration
      - `operating_as` (text) - Operating airline ICAO code
      - `painted_as` (text) - Painted-as airline ICAO code
      - `orig_iata` (text) - Origin airport IATA code
      - `orig_icao` (text) - Origin airport ICAO code
      - `dest_iata` (text) - Destination airport IATA code
      - `dest_icao` (text) - Destination airport ICAO code
      - `eta` (timestamptz) - Estimated time of arrival
      - `data` (jsonb) - Full FR24 response for future use
      - `cached_at` (timestamptz) - When this entry was cached

  2. Security
    - RLS enabled
    - Read policy for authenticated users (cache is shared data)

  3. Notes
    - Cache entries expire after 10 minutes (enforced in edge function)
    - Callsign is the primary lookup key since that's what we have from OpenSky
    - Index on cached_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS flight_details_cache (
  callsign text PRIMARY KEY,
  icao24 text NOT NULL DEFAULT '',
  fr24_id text NOT NULL DEFAULT '',
  flight text NOT NULL DEFAULT '',
  aircraft_type text NOT NULL DEFAULT '',
  registration text NOT NULL DEFAULT '',
  operating_as text NOT NULL DEFAULT '',
  painted_as text NOT NULL DEFAULT '',
  orig_iata text NOT NULL DEFAULT '',
  orig_icao text NOT NULL DEFAULT '',
  dest_iata text NOT NULL DEFAULT '',
  dest_icao text NOT NULL DEFAULT '',
  eta timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  cached_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_details_cache_cached_at
  ON flight_details_cache (cached_at);

CREATE INDEX IF NOT EXISTS idx_flight_details_cache_icao24
  ON flight_details_cache (icao24);

ALTER TABLE flight_details_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read flight cache"
  ON flight_details_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert flight cache"
  ON flight_details_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update flight cache"
  ON flight_details_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete flight cache"
  ON flight_details_cache
  FOR DELETE
  TO service_role
  USING (true);
