/*
  # Create strike events table for animated war map

  1. New Tables
    - `strike_events`
      - `id` (uuid, primary key) - Unique event identifier
      - `event_type` (text) - Type of strike: ballistic_missile, cruise_missile, rocket, drone, air_strike, artillery
      - `source_country` (text) - Country of origin for the strike
      - `source_label` (text) - Display name for source location
      - `source_lat` (double precision) - Launch site latitude
      - `source_lng` (double precision) - Launch site longitude
      - `target_label` (text) - Display name for target location
      - `target_lat` (double precision) - Target latitude
      - `target_lng` (double precision) - Target longitude
      - `projectile_count` (integer) - Number of projectiles in the salvo
      - `estimated_flight_time_seconds` (integer) - Calculated flight time based on weapon type and distance
      - `weapon_name` (text) - Specific weapon system name if identified
      - `headline` (text) - The news headline that triggered detection
      - `confidence` (double precision) - AI classification confidence score 0-1
      - `status` (text) - active, completed, expired
      - `detected_at` (timestamptz) - When the event was detected
      - `expires_at` (timestamptz) - When the animation should expire
      - `created_at` (timestamptz) - Row creation timestamp

  2. Security
    - Enable RLS on `strike_events` table
    - Authenticated users can read active events
    - Only service role can insert/update (via edge function)

  3. Indexes
    - Index on status + expires_at for fast active event queries
    - Index on detected_at for chronological queries
*/

CREATE TABLE IF NOT EXISTS strike_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'rocket',
  source_country text NOT NULL DEFAULT '',
  source_label text NOT NULL DEFAULT '',
  source_lat double precision NOT NULL DEFAULT 0,
  source_lng double precision NOT NULL DEFAULT 0,
  target_label text NOT NULL DEFAULT '',
  target_lat double precision NOT NULL DEFAULT 0,
  target_lng double precision NOT NULL DEFAULT 0,
  projectile_count integer NOT NULL DEFAULT 1,
  estimated_flight_time_seconds integer NOT NULL DEFAULT 60,
  weapon_name text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  confidence double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE strike_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read strike events"
  ON strike_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert strike events"
  ON strike_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update strike events"
  ON strike_events
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_strike_events_active
  ON strike_events (status, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_strike_events_detected
  ON strike_events (detected_at DESC);