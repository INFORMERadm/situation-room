/*
  # Create chat session and message tables for AI chat

  1. New Tables
    - `chat_sessions`
      - `id` (uuid, primary key, auto-generated)
      - `title` (text, nullable, auto-generated from first message)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    - `chat_messages`
      - `id` (uuid, primary key, auto-generated)
      - `session_id` (uuid, FK to chat_sessions.id, cascade delete)
      - `role` (text, 'user' | 'assistant' | 'system')
      - `content` (text)
      - `tool_calls` (jsonb, nullable, stores tool invocations)
      - `created_at` (timestamptz, default now())
  2. Indexes
    - Index on chat_messages(session_id, created_at) for fast retrieval
  3. Security
    - Enable RLS on both tables
    - Add policies for anon access (matches existing market_cache pattern)
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on chat_sessions"
  ON chat_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on chat_sessions"
  ON chat_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on chat_sessions"
  ON chat_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on chat_messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on chat_messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at);
