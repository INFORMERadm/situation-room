/*
  # Fix storage download policy for messaging files

  1. Changes
    - Replace the existing storage SELECT policy with a simpler one
    - Use path-based conversation_id extraction instead of nested RLS joins
    - The file path format is: {sender_id}/{conversation_id}/{uuid}.enc
    - Check that the requesting user is a participant in the conversation
  
  2. Why
    - The old policy used LIKE with nested RLS joins through messaging_file_transfers,
      messaging_messages, and messaging_participants, which could silently fail
    - The new policy directly checks conversation membership using the path
*/

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can read messaging files in their conversations'
  ) THEN
    DROP POLICY "Users can read messaging files in their conversations" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Users can read messaging files in their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'messaging-files'
    AND EXISTS (
      SELECT 1 FROM messaging_participants mp
      WHERE mp.conversation_id = (string_to_array(name, '/'))[2]::uuid
      AND mp.user_id = auth.uid()
    )
  );
