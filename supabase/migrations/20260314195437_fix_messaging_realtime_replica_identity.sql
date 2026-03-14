/*
  # Fix Messaging Realtime: Set REPLICA IDENTITY FULL

  ## Problem
  All messaging tables had REPLICA IDENTITY DEFAULT (primary key only).
  Supabase Realtime postgres_changes subscriptions need REPLICA IDENTITY FULL
  to evaluate RLS policies that reference non-PK columns (e.g. conversation_id,
  user_id). Without FULL identity, the Realtime service cannot pass the full row
  to the RLS evaluator, so events are silently dropped and:
    - Desktop notifications stop working (global messages listener gets nothing)
    - Conversation list doesn't update in real-time
    - Per-conversation message subscriptions may miss events

  ## Fix
  Set REPLICA IDENTITY FULL on all four messaging tables so Supabase Realtime
  can evaluate RLS policies correctly and deliver events to authorized subscribers.

  Also add the tables to the supabase_realtime publication if not already present.
*/

ALTER TABLE messaging_messages REPLICA IDENTITY FULL;
ALTER TABLE messaging_conversations REPLICA IDENTITY FULL;
ALTER TABLE messaging_participants REPLICA IDENTITY FULL;
ALTER TABLE messaging_voice_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messaging_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messaging_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messaging_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messaging_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messaging_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messaging_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messaging_voice_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messaging_voice_sessions;
  END IF;
END $$;
