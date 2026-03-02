/*
  # Fix messaging_participants UPDATE policy

  1. Changes
    - Drop the existing restrictive UPDATE policy on messaging_participants
    - Add new policy allowing:
      - Users to update their own participant record (last_read_at, public_key, etc.)
      - Conversation creators/admins to update any participant's encrypted_conversation_key
    
  2. Reason
    - When creating a group, the creator needs to distribute encryption keys to all
      participants by updating their encrypted_conversation_key column
    - The old policy only allowed users to update their own row, blocking key distribution
*/

DROP POLICY IF EXISTS "Users can update their own participant record" ON messaging_participants;

CREATE POLICY "Users can update own record or admin can distribute keys"
  ON messaging_participants FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messaging_participants mp
      WHERE mp.conversation_id = messaging_participants.conversation_id
      AND mp.user_id = auth.uid()
      AND mp.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM messaging_conversations mc
      WHERE mc.id = messaging_participants.conversation_id
      AND mc.created_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messaging_participants mp
      WHERE mp.conversation_id = messaging_participants.conversation_id
      AND mp.user_id = auth.uid()
      AND mp.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM messaging_conversations mc
      WHERE mc.id = messaging_participants.conversation_id
      AND mc.created_by = auth.uid()
    )
  );