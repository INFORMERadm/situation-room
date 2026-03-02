/*
  # Fix messaging_conversations UPDATE policy

  1. Changes
    - Drop existing UPDATE policy that only checks admin participants
    - New policy also allows the conversation creator to update
    
  2. Reason
    - After creating a conversation and before participants are fully set up,
      the creator needs to update the conversation's updated_at timestamp
    - The old policy required admin participant status which may not exist yet
*/

DROP POLICY IF EXISTS "Conversation admins can update conversations" ON messaging_conversations;

CREATE POLICY "Creator or admin can update conversations"
  ON messaging_conversations FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messaging_participants
      WHERE messaging_participants.conversation_id = messaging_conversations.id
      AND messaging_participants.user_id = auth.uid()
      AND messaging_participants.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messaging_participants
      WHERE messaging_participants.conversation_id = messaging_conversations.id
      AND messaging_participants.user_id = auth.uid()
      AND messaging_participants.role = 'admin'
    )
  );