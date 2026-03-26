/*
  # Create user alerts table

  1. New Tables
    - `user_alerts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `alert_type` (text: 'keyword' or 'price')
      - `name` (text, human-readable label)
      - `keywords` (text array, for keyword alerts)
      - `symbol` (text, nullable, for price alerts)
      - `price_condition` (text, nullable: 'above' or 'below')
      - `price_target` (numeric, nullable)
      - `enabled` (boolean, default true)
      - `last_triggered_at` (timestamptz, nullable)
      - `natural_language_query` (text, nullable, stores original user input)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_alerts` table
    - Add policies for authenticated users to manage their own alerts
*/

CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  alert_type text NOT NULL CHECK (alert_type IN ('keyword', 'price')),
  name text NOT NULL DEFAULT '',
  keywords text[] DEFAULT '{}',
  symbol text,
  price_condition text CHECK (price_condition IS NULL OR price_condition IN ('above', 'below')),
  price_target numeric,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  natural_language_query text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON user_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON user_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON user_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON user_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
