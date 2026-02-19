/*
  # Create Watchlists Feature

  ## Summary
  Adds support for multiple named watchlists per user.

  ## New Tables

  ### watchlists
  - `id` (uuid, primary key) — unique watchlist identifier
  - `user_id` (uuid) — references auth.users, nullable for anonymous use
  - `name` (text) — user-defined watchlist name
  - `sort_order` (integer) — display order of watchlist tabs
  - `created_at` (timestamptz) — creation timestamp

  ### watchlist_items
  - `id` (uuid, primary key)
  - `watchlist_id` (uuid) — references watchlists(id) with cascade delete
  - `symbol` (text) — ticker symbol
  - `name` (text) — display name of the instrument
  - `position` (integer) — ordering within the watchlist
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can only access their own watchlists
  - Anonymous users have no server-side access (localStorage fallback used in app)

  ## Notes
  1. The app falls back to localStorage for anonymous (unauthenticated) users
  2. Cascade delete on watchlist_items when a watchlist is deleted
  3. Index on watchlist_items.watchlist_id for fast per-watchlist queries
*/

CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Watchlist',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid REFERENCES watchlists(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlists"
  ON watchlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists"
  ON watchlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
  ON watchlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
  ON watchlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view items of own watchlists"
  ON watchlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items into own watchlists"
  ON watchlist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own watchlists"
  ON watchlist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own watchlists"
  ON watchlist_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );
