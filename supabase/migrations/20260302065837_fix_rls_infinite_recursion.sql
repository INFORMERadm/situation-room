/*
  # Fix infinite recursion in messaging RLS policies

  1. Problem
    - messaging_conversations SELECT policy queries messaging_participants
    - messaging_participants SELECT policy self-references messaging_participants
    - This creates infinite recursion when Postgres evaluates RLS policies

  2. Solution
    - Create a SECURITY DEFINER helper function that bypasses RLS to check
      if a user is a participant in a conversation
    - Rewrite affected policies to use this helper instead of subqueries
    - This breaks the circular dependency chain

  3. Changes
    - New function: is_conversation_participant(conv_id, uid) 
    - New function: is_conversation_admin_or_creator(conv_id, uid)
    - Recreated SELECT policy on messaging_conversations
    - Recreated UPDATE policy on messaging_conversations
    - Recreated SELECT policy on messaging_participants
    - Recreated DELETE policy on messaging_participants
    - Recreated UPDATE policy on messaging_participants
*/

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messaging_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_admin(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messaging_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
$$;

-- messaging_conversations: fix SELECT policy
DROP POLICY IF EXISTS "Users can view conversations they created or participate in" ON messaging_conversations;
CREATE POLICY "Users can view conversations they created or participate in"
  ON messaging_conversations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_conversation_participant(id, auth.uid())
  );

-- messaging_conversations: fix UPDATE policy
DROP POLICY IF EXISTS "Creator or admin can update conversations" ON messaging_conversations;
CREATE POLICY "Creator or admin can update conversations"
  ON messaging_conversations FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_conversation_admin(id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_conversation_admin(id, auth.uid())
  );

-- messaging_participants: fix SELECT policy (was self-referencing)
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON messaging_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON messaging_participants FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- messaging_participants: fix DELETE policy (was self-referencing)
DROP POLICY IF EXISTS "Self or admins can remove participants" ON messaging_participants;
CREATE POLICY "Self or admins can remove participants"
  ON messaging_participants FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_conversation_admin(conversation_id, auth.uid())
  );

-- messaging_participants: fix UPDATE policy (was self-referencing + cross-referencing)
DROP POLICY IF EXISTS "Users can update own record or admin can distribute keys" ON messaging_participants;
CREATE POLICY "Users can update own record or admin can distribute keys"
  ON messaging_participants FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_conversation_admin(conversation_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM messaging_conversations mc
      WHERE mc.id = messaging_participants.conversation_id
      AND mc.created_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_conversation_admin(conversation_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM messaging_conversations mc
      WHERE mc.id = messaging_participants.conversation_id
      AND mc.created_by = auth.uid()
    )
  );