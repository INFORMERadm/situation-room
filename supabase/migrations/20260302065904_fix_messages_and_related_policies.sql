/*
  # Fix remaining messaging policies to use helper functions

  1. Changes
    - Update messaging_messages SELECT and INSERT policies to use
      is_conversation_participant() helper instead of direct subqueries
    - Update messaging_voice_sessions SELECT and INSERT policies similarly
    - This ensures no policy triggers the participants SELECT RLS policy
      which could cause recursion issues

  2. Affected tables
    - messaging_messages (SELECT, INSERT)
    - messaging_voice_sessions (SELECT, INSERT)
*/

-- messaging_messages: fix SELECT
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messaging_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messaging_messages FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_conversation_participant(conversation_id, auth.uid())
  );

-- messaging_messages: fix INSERT
DROP POLICY IF EXISTS "Participants can send messages" ON messaging_messages;
CREATE POLICY "Participants can send messages"
  ON messaging_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_participant(conversation_id, auth.uid())
  );

-- messaging_voice_sessions: fix SELECT
DROP POLICY IF EXISTS "Participants can view voice sessions" ON messaging_voice_sessions;
CREATE POLICY "Participants can view voice sessions"
  ON messaging_voice_sessions FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- messaging_voice_sessions: fix INSERT
DROP POLICY IF EXISTS "Participants can create voice sessions" ON messaging_voice_sessions;
CREATE POLICY "Participants can create voice sessions"
  ON messaging_voice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = started_by
    AND is_conversation_participant(conversation_id, auth.uid())
  );