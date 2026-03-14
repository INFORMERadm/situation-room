/*
  # Fix REPLICA IDENTITY on Messaging Tables

  ## Problem
  All three messaging tables had REPLICA IDENTITY set to FULL. This breaks Supabase
  Realtime column-equality filters (like `conversation_id=eq.{id}`) on INSERT events
  because FULL sends the OLD row in the WAL stream, and on INSERT there is no old row --
  so the filter matches nothing and the event is silently dropped.

  Result: no Realtime events delivered, no audio chime, no desktop notifications.

  ## Fix
  Reset REPLICA IDENTITY to DEFAULT (primary key only) on all three messaging tables.
  This is the correct setting for Supabase Realtime with filter-based subscriptions.

  ## Tables Modified
  - `messaging_messages` -- main messages table, primary driver of notifications
  - `messaging_participants` -- participant change listener
  - `messaging_conversations` -- conversation metadata listener

  ## Notes
  - This is non-destructive: no data is removed, no schema changes
  - DEFAULT means Postgres includes only the primary key in the WAL stream for UPDATE/DELETE
  - INSERT events always include the full NEW row regardless of this setting
*/

ALTER TABLE messaging_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE messaging_participants REPLICA IDENTITY DEFAULT;
ALTER TABLE messaging_conversations REPLICA IDENTITY DEFAULT;
