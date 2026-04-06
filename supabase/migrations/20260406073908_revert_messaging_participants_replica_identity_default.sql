/*
  # Revert messaging_participants replica identity to DEFAULT

  1. Changes
    - Revert `messaging_participants` back to DEFAULT replica identity
    - FULL replica identity breaks Supabase Realtime INSERT filter subscriptions,
      which prevents desktop notifications from detecting new conversation memberships

  2. Important Notes
    - This reverts the change from the previous migration
    - DEFAULT is the correct setting for tables using filtered Supabase Realtime subscriptions
*/

ALTER TABLE messaging_participants REPLICA IDENTITY DEFAULT;
