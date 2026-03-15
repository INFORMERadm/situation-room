# Desktop Notifications in N4

## Overview

N4 uses two complementary notification mechanisms to alert users to new incoming messages when the chat sidebar is closed:

1. **Audio chime** -- a three-note ascending tone synthesised in-browser via the Web Audio API
2. **Desktop notification** -- a native OS notification bubble via the browser Notification API

Both fire together on the same event: a Realtime INSERT on the `messaging_messages` table from a sender other than the current user.

---

## Architecture

### File map

| File | Role |
|---|---|
| `src/hooks/useMessageNotifications.ts` | Subscribes to Realtime, fires audio + desktop notification |
| `src/lib/alarmSound.ts` | Synthesises all audio alerts including `playChatNotification()` |
| `src/components/chat/ChatSidebar.tsx` | Renders the permission banner and Test Notif button |
| `src/pages/MarketsDashboard.tsx` | Mounts `useMessageNotifications` hook |

---

## How it works end-to-end

### 1. Hook mount (`useMessageNotifications`)

`useMessageNotifications` is called inside `MarketsDashboard` and receives two props:

```ts
useMessageNotifications({ userId: user?.id, chatSidebarOpen: platform.chatSidebarOpen });
```

On mount the hook:

1. Queries `messaging_participants` to find every conversation the current user belongs to.
2. For each conversation, resolves the human-readable name (the other person's display name for direct chats, or the group name for group chats).
3. Opens one Supabase Realtime channel per conversation, subscribed to `INSERT` events on `messaging_messages` filtered by `conversation_id=eq.{id}`.
4. Opens a second channel on `messaging_participants` to detect when the user is added to new conversations; on change it re-runs step 1-3.

### 2. Incoming message event

When a new row arrives on the Realtime channel the callback checks four guards:

| Guard | Purpose |
|---|---|
| `!row.conversation_id` | Safety: malformed payload |
| `row.sender_id === userId` | Skip messages the current user sent |
| `row.message_type === 'system'` | Skip system join/leave messages |
| `chatOpenRef.current === true` | Skip if the chat sidebar is already open |

If all guards pass:

1. `playChatNotification()` is called -- plays C5, E5, G5 in quick succession.
2. `showDesktopNotification()` is called with the resolved conversation name.

### 3. Audio (`playChatNotification`)

Defined in `src/lib/alarmSound.ts`. Uses the Web Audio API to synthesise three sine-wave oscillators at 523 Hz, 659 Hz, and 784 Hz (C5, E5, G5), each 150 ms long, offset by 120 ms from each other.

The `AudioContext` is only created after the first user interaction (click or keydown) to comply with browser autoplay policy. If no interaction has occurred yet, the function returns silently.

### 4. Desktop notification (`showDesktopNotification`)

Wraps the browser `Notification` constructor. Only fires if `Notification.permission === 'granted'`. Each notification carries:

- **title**: `"New message"`
- **body**: `"Message from {name}"` or `"You have a new message"` as fallback
- **icon**: `/icon_orange.png`
- **tag**: `"n4-chat-{timestamp}"` (unique per notification to prevent deduplication suppression)

---

## Permission flow

### Initial state

The browser starts in one of three permission states:

| State | Meaning |
|---|---|
| `default` | User has not been asked yet |
| `granted` | User has approved notifications |
| `denied` | User has blocked notifications |

### UI in ChatSidebar

When the chat sidebar mounts it reads `Notification.permission` and shows:

- **`default`** -- a subtle green clickable banner: _"Click to enable desktop notifications for new messages."_ Clicking it calls `requestNotificationPermission()` which triggers the browser prompt.
- **`denied`** -- an orange warning banner: _"Notifications are blocked. Enable them in your browser site settings..."_ No action possible from within the app; the user must go to browser site settings.
- **`granted`** -- no banner shown.

### Test Notif button

A small "Test Notif" button in the chat sidebar header lets you verify the full stack at any time:

- If permission is `default`, clicking it triggers the permission prompt first.
- If permission is `granted` or `denied`, clicking it fires `testNotification()` which plays the chime and sends a test desktop notification immediately.

---

## Subscription logging

Each Realtime channel logs its status to the browser console under the `[notifications]` prefix:

```
[notifications] notify-msgs-{convId} channel SUBSCRIBED
[notifications] participant-changes channel SUBSCRIBED
```

If a channel fails to subscribe, a `console.warn` fires with the status string and error object. This makes subscription failures visible during debugging instead of silently failing.

---

## Why notifications stopped working -- Root cause and fix (March 2026)

### Symptom

Desktop notifications and audio chimes stopped firing for incoming messages. No errors were visible in the browser console. Realtime channels showed as SUBSCRIBED. Messages were still delivered correctly when the thread was open (because those use a separate `useMessaging` subscription without a column filter).

### Root cause

A prior migration had set `REPLICA IDENTITY FULL` on all three messaging tables:

```sql
ALTER TABLE messaging_messages REPLICA IDENTITY FULL;
ALTER TABLE messaging_participants REPLICA IDENTITY FULL;
ALTER TABLE messaging_conversations REPLICA IDENTITY FULL;
```

`REPLICA IDENTITY FULL` instructs Postgres to include the entire **old** row in the WAL (Write-Ahead Log) stream for every change. Supabase Realtime uses this WAL stream to evaluate column-equality filters such as:

```
conversation_id=eq.550e8400-e29b-41d4-a716-446655440000
```

The filter is evaluated against the WAL record. For `UPDATE` and `DELETE` operations, the old row is present, so the filter can match. For `INSERT` operations, **there is no old row** -- only the new row exists. With `REPLICA IDENTITY FULL`, Supabase Realtime was looking at the old-row slot (which is empty for INSERT), failing to match the filter, and **silently dropping the event**.

The result: every incoming message triggered a WAL event, the channel was subscribed, but zero events were delivered to the client callback.

### Why it was hard to diagnose

- The Realtime channels showed status `SUBSCRIBED` with no errors.
- Messages appeared in the thread view fine (that subscription does not use a column filter -- it filters client-side after receiving all events for the channel, or uses a non-filtered channel).
- No browser console errors were produced.
- The issue only affected filtered INSERT subscriptions.

### Fix

Migration `20260314200911_fix_messaging_replica_identity.sql` resets all three tables back to the Postgres default:

```sql
ALTER TABLE messaging_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE messaging_participants REPLICA IDENTITY DEFAULT;
ALTER TABLE messaging_conversations REPLICA IDENTITY DEFAULT;
```

`REPLICA IDENTITY DEFAULT` means Postgres only includes the primary key in the WAL stream for UPDATE/DELETE operations. For INSERT operations, the full new row is always included regardless of this setting, which allows Supabase Realtime column-equality filters to match correctly.

This is the **correct and recommended setting for Supabase Realtime with filter-based subscriptions.**

### Rule of thumb

> Never set `REPLICA IDENTITY FULL` on tables where you intend to use filtered Supabase Realtime INSERT subscriptions. Use `REPLICA IDENTITY DEFAULT` (the Postgres default) for those tables.

`REPLICA IDENTITY FULL` is intended for logical replication scenarios where consumers need the full old row for UPDATE/DELETE processing. It is not needed for Supabase Realtime and breaks INSERT filters.

---

## Summary of all relevant files after the fix

### `src/hooks/useMessageNotifications.ts`
- Exports `requestNotificationPermission`, `showDesktopNotification`, `testNotification` as named exports (accessible to UI components)
- `useMessageNotifications` hook handles all Realtime subscriptions and notification dispatch
- All channel subscribes now pass a status callback for console logging

### `src/components/chat/ChatSidebar.tsx`
- Reads `Notification.permission` on mount
- Renders a `default` or `denied` banner as appropriate
- "Test Notif" button in the title bar for manual verification

### `src/lib/alarmSound.ts`
- `playChatNotification()` -- three-note ascending chime (C5, E5, G5)
- All audio is gated behind user interaction detection to satisfy browser autoplay policy
