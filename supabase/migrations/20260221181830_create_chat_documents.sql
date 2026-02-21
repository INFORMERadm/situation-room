/*
  # Create chat_documents table and storage bucket for file attachments

  ## Summary
  This migration sets up permanent, per-user document storage so that files
  attached to chat sessions remain accessible in any future session.

  ## New Tables

  ### chat_documents
  Stores metadata and extracted text content for all documents a user uploads.
  - `id` (uuid, PK) — unique document identifier
  - `user_id` (uuid, FK → auth.users) — owner of the document
  - `session_id` (uuid, nullable) — the chat session this doc was first attached to
  - `filename` (text) — original display name of the uploaded file
  - `mime_type` (text) — MIME type (application/pdf, etc.)
  - `file_size_bytes` (bigint) — raw file size
  - `storage_path` (text, nullable) — path inside the chat-documents storage bucket
  - `extracted_text` (text) — full text content extracted server-side
  - `char_count` (int) — character count of extracted_text
  - `status` (text) — processing / ready / error
  - `error_message` (text, nullable) — populated when status = error
  - `created_at` (timestamptz) — creation timestamp

  ## Security
  - RLS enabled; users can only access their own rows.
  - Separate policies for SELECT, INSERT, UPDATE (no DELETE by design — docs persist).

  ## Storage Bucket
  - Creates the `chat-documents` bucket with per-user folder isolation via RLS.
  - Users can upload, read, and list only their own files (path prefix = user_id).
*/

CREATE TABLE IF NOT EXISTS chat_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      uuid,
  filename        text NOT NULL DEFAULT '',
  mime_type       text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  storage_path    text,
  extracted_text  text NOT NULL DEFAULT '',
  char_count      int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'processing',
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_documents_user_id_idx ON chat_documents (user_id);
CREATE INDEX IF NOT EXISTS chat_documents_session_id_idx ON chat_documents (session_id);

ALTER TABLE chat_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON chat_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON chat_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON chat_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-documents',
  'chat-documents',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
