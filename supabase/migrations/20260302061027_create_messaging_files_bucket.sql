/*
  # Create messaging-files storage bucket

  1. New Storage
    - `messaging-files` bucket for encrypted file transfers
    - 50MB file size limit
    - Private bucket (not public)
  
  2. Security
    - Authenticated users can upload to their own user folder
    - Authenticated users can read files they have access to via conversation participation
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('messaging-files', 'messaging-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to own messaging folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'messaging-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read messaging files in their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'messaging-files'
    AND EXISTS (
      SELECT 1 FROM messaging_file_transfers ft
      JOIN messaging_messages mm ON mm.id = ft.message_id
      JOIN messaging_participants mp ON mp.conversation_id = mm.conversation_id
      WHERE mp.user_id = auth.uid()
      AND ft.encrypted_file_url LIKE '%' || storage.objects.name || '%'
    )
  );

CREATE POLICY "Users can delete own messaging files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'messaging-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );