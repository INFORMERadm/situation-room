/*
  # Add DELETE policy for messaging_conversations

  1. Security Changes
    - Add DELETE policy on `messaging_conversations`
    - For direct chats: either participant can delete
    - For group chats: only the creator (created_by) can delete
    - All child rows (participants, messages, file_transfers, voice_sessions)
      cascade-delete via existing FK constraints
*/

CREATE POLICY "Creator can delete conversations"
  ON messaging_conversations FOR DELETE
  TO authenticated
  USING (
    (type = 'direct' AND is_conversation_participant(id, auth.uid()))
    OR
    (type = 'group' AND created_by = auth.uid())
  );
