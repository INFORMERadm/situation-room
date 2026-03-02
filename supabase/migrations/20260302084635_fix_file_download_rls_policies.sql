/*
  # Fix file download RLS policies

  1. Problem
    - The messaging_file_transfers SELECT policy joins messaging_messages directly,
      which triggers nested RLS evaluation causing 500 errors for non-senders
    - The storage SELECT policy queries messaging_participants directly, which also
      has RLS enabled, causing another nested RLS failure

  2. Fix
    - Replace messaging_file_transfers SELECT policy to use the existing
      is_conversation_participant() SECURITY DEFINER function, bypassing nested RLS
    - Replace storage SELECT policy to also use is_conversation_participant()
    - Both changes avoid the nested RLS chain that caused silent 500 errors

  3. Security
    - Access is still restricted to authenticated conversation participants only
    - No change in authorization logic, only in how it's evaluated
*/

-- Fix messaging_file_transfers SELECT policy
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messaging_file_transfers'
    AND policyname = 'Users can view file transfers in their conversations'
  ) THEN
    DROP POLICY "Users can view file transfers in their conversations" ON messaging_file_transfers;
  END IF;
END $$;

CREATE POLICY "Users can view file transfers in their conversations"
  ON messaging_file_transfers FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(
      (SELECT mm.conversation_id FROM messaging_messages mm WHERE mm.id = messaging_file_transfers.message_id),
      auth.uid()
    )
  );

-- Fix storage SELECT policy
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
    AND is_conversation_participant(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  );
