/*
  # Fix messaging_conversations SELECT policy

  1. Changes
    - Drop existing SELECT policy that only allows participant-based access
    - New policy also allows the conversation creator to view their own conversation
    
  2. Reason
    - After creating a conversation with INSERT + .select(), the SELECT RLS policy 
      blocks the returned row because no participants exist yet
    - The creator must be able to see the conversation they just created so the 
      chained .select().single() returns the row
    - Without this, group creation and 1-on-1 chat creation silently fail
*/

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON messaging_conversations;

CREATE POLICY "Users can view conversations they created or participate in"
  ON messaging_conversations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messaging_participants
      WHERE messaging_participants.conversation_id = messaging_conversations.id
      AND messaging_participants.user_id = auth.uid()
    )
  );