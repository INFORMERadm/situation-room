/*
  # Create web_search_results table

  1. New Tables
    - `web_search_results`
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK to chat_sessions)
      - `message_id` (uuid, nullable - linked to the assistant message)
      - `query` (text - the user's search query)
      - `sources` (jsonb - array of source objects with title, url, domain, favicon, snippet, etc.)
      - `search_mode` (text - "tavily" or "advanced", default "tavily")
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `web_search_results` table
    - Add policy for service role access (edge function uses service role key)

  3. Notes
    - This table stores search results associated with chat sessions
    - Allows sources panel to persist across page reloads and session switches
    - Sources are stored as JSONB for flexible schema
*/

CREATE TABLE IF NOT EXISTS web_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id),
  message_id uuid,
  query text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_mode text NOT NULL DEFAULT 'tavily',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE web_search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage web search results"
  ON web_search_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_web_search_results_session
  ON web_search_results(session_id);

CREATE INDEX IF NOT EXISTS idx_web_search_results_created
  ON web_search_results(created_at DESC);
