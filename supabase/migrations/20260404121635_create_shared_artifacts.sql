/*
  # Create shared_artifacts table

  1. New Tables
    - `shared_artifacts`
      - `id` (uuid, primary key) - unique artifact identifier
      - `user_id` (uuid, FK to auth.users) - the creator
      - `share_token` (text, unique, indexed) - public URL slug (8-char alphanumeric)
      - `title` (text) - artifact title
      - `html_content` (text) - full HTML of the artifact
      - `is_password_protected` (boolean, default false)
      - `password_hash` (text, nullable) - bcrypt hash of optional password
      - `view_count` (integer, default 0) - number of views
      - `is_active` (boolean, default true) - allows creator to deactivate sharing
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, nullable) - optional expiration

  2. Security
    - Enable RLS on `shared_artifacts` table
    - Authenticated users can INSERT their own artifacts
    - Authenticated users can UPDATE their own artifacts
    - Authenticated users can DELETE their own artifacts
    - Authenticated users can SELECT their own artifacts
    - Anonymous users can SELECT active artifacts by share_token (for public access)

  3. Indexes
    - Unique index on share_token for fast lookups
*/

CREATE TABLE IF NOT EXISTS shared_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  share_token text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  is_password_protected boolean NOT NULL DEFAULT false,
  password_hash text,
  view_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_shared_artifacts_share_token ON shared_artifacts(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_artifacts_user_id ON shared_artifacts(user_id);

ALTER TABLE shared_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own artifacts"
  ON shared_artifacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artifacts"
  ON shared_artifacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own artifacts"
  ON shared_artifacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own artifacts"
  ON shared_artifacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active shared artifacts by token"
  ON shared_artifacts FOR SELECT
  TO anon
  USING (is_active = true);
