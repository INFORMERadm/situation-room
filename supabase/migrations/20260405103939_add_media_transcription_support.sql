/*
  # Add media transcription support to chat_documents

  1. Modified Tables
    - `chat_documents`
      - `media_type` (text, nullable) -- 'audio', 'video', 'youtube', or null for standard documents
      - `source_url` (text, nullable) -- stores YouTube or external video URL when applicable
      - `transcription_language` (text, nullable) -- the Whisper language code selected by the user (e.g., 'en', 'es', 'de')

  2. Storage Changes
    - Updates `chat-documents` bucket file_size_limit from 100MB to 500MB
    - Adds audio and video MIME types to the allowed list

  3. Important Notes
    - No existing data is modified or deleted
    - New columns are nullable so existing rows are unaffected
    - Storage bucket update is additive (expands accepted types, increases size limit)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_documents' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE chat_documents ADD COLUMN media_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_documents' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE chat_documents ADD COLUMN source_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_documents' AND column_name = 'transcription_language'
  ) THEN
    ALTER TABLE chat_documents ADD COLUMN transcription_language text;
  END IF;
END $$;

UPDATE storage.buckets
SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    'audio/flac',
    'audio/webm',
    'audio/x-m4a',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE id = 'chat-documents';