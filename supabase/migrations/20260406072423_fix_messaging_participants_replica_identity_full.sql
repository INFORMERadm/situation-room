/*
  # Fix messaging_participants replica identity

  1. Changes
    - Set `messaging_participants` to FULL replica identity
    - This ensures Supabase realtime UPDATE events include all column values,
      enabling proper filtering and key change detection for encrypted chat sync

  2. Important Notes
    - Required for the encryption key sync feature where participants need to
      detect when their `encrypted_conversation_key` is updated by another user
*/

ALTER TABLE messaging_participants REPLICA IDENTITY FULL;
