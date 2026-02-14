/*
  # Add DELETE policy for chat_sessions

  1. Security Changes
    - Add DELETE policy on `chat_sessions` for anon role
    - This allows conversation deletion from the frontend
    - Messages cascade-delete via FK constraint on chat_messages
*/

CREATE POLICY "Allow anon delete on chat_sessions"
  ON chat_sessions FOR DELETE
  TO anon
  USING (true);
