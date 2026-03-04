/*
  # Create user news feeds table

  1. New Tables
    - `user_news_feeds`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `feed_type` (text: 'linkedin', 'rss', 'youtube')
      - `url` (text, the feed/channel URL)
      - `display_name` (text, user-friendly name)
      - `column_position` (text: 'left', 'center', 'right')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_news_feeds` table
    - Authenticated users can only access their own feeds
*/

CREATE TABLE IF NOT EXISTS user_news_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  feed_type text NOT NULL DEFAULT 'rss',
  url text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  column_position text NOT NULL DEFAULT 'center',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_feed_type CHECK (feed_type IN ('linkedin', 'rss', 'youtube')),
  CONSTRAINT valid_column_position CHECK (column_position IN ('left', 'center', 'right'))
);

ALTER TABLE user_news_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feeds"
  ON user_news_feeds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feeds"
  ON user_news_feeds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feeds"
  ON user_news_feeds FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feeds"
  ON user_news_feeds FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
