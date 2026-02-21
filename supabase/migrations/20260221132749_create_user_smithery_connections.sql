/*
  # Create user_smithery_connections table

  ## Purpose
  Stores each user's connected Smithery MCP servers so they persist across sessions
  and can be loaded into voice mode tool calls.

  ## New Tables
  - `user_smithery_connections`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users, not null)
    - `smithery_namespace` (text) - the Smithery namespace for the Connect API
    - `smithery_connection_id` (text) - the unique connection ID within that namespace
    - `mcp_url` (text) - the MCP server URL (e.g. https://server.smithery.ai/@user/my-server)
    - `display_name` (text) - human-readable label shown in UI
    - `status` (text) - 'connected', 'auth_required', or 'error'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled; users can only read/write their own rows
  - Separate policies for SELECT, INSERT, UPDATE, DELETE

  ## Notes
  1. `smithery_connection_id` combined with `user_id` should be unique
  2. The combination (user_id, smithery_connection_id) prevents duplicate connections
*/

CREATE TABLE IF NOT EXISTS user_smithery_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  smithery_namespace text NOT NULL DEFAULT '',
  smithery_connection_id text NOT NULL DEFAULT '',
  mcp_url text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'connected',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, smithery_connection_id)
);

ALTER TABLE user_smithery_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON user_smithery_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON user_smithery_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON user_smithery_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON user_smithery_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_smithery_connections_user_id
  ON user_smithery_connections (user_id);
