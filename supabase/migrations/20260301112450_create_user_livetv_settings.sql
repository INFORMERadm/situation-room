/*
  # Create user live TV settings table

  1. New Tables
    - `user_livetv_settings`
      - `user_id` (uuid, primary key, FK to auth.users)
      - `channel_order` (jsonb) - ordered array of channel IDs
      - `hidden_channels` (jsonb) - array of hidden channel IDs
      - `selected_channel` (text) - currently active channel ID
      - `muted` (boolean) - whether audio is muted
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_livetv_settings`
    - Users can only read their own settings
    - Users can only insert their own settings
    - Users can only update their own settings
    - Users can only delete their own settings
*/

CREATE TABLE IF NOT EXISTS user_livetv_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  channel_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_channel text NOT NULL DEFAULT 'bloomberg',
  muted boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_livetv_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own livetv settings"
  ON user_livetv_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own livetv settings"
  ON user_livetv_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own livetv settings"
  ON user_livetv_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own livetv settings"
  ON user_livetv_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
