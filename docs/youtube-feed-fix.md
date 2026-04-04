# YouTube Feed Fix — RSS Endpoint Deprecation

**Date:** 2026-03-25

## Problem

All YouTube channels in the News Deck YouTube panel were returning "No items found" with zero videos loading. This affected every single YouTube channel feed (RealLifeLore, Caspian Report, AITelly, Stoic Finance, US Centcom, ILTV, TBN Israel, Diary of a CEO).

## Root Cause

YouTube deprecated and killed their public RSS feed endpoint (`https://www.youtube.com/feeds/videos.xml?channel_id=...`). All stored feed URLs in the `user_news_feeds` table pointed to this dead endpoint, which was returning HTTP 404 and 500 errors.

This was a YouTube-side change — not a bug in our code. The RSS endpoint had been the standard way to fetch YouTube channel feeds for years.

## Solution

### Edge Function (`supabase/functions/rss-proxy/index.ts`)

Replaced the RSS XML fetch approach with a page-scraping strategy:

1. **New `youtube=true` query parameter** — The frontend now passes `youtube=true` to indicate a YouTube feed request, routing it through a dedicated code path instead of the generic RSS/XML fetcher.

2. **Channel page scraping** — The edge function fetches the YouTube channel's `/videos` page (e.g., `https://www.youtube.com/channel/UC.../videos`) and extracts video data from YouTube's embedded `ytInitialData` JSON blob in the HTML.

3. **Channel ID resolution** — The `resolveYoutubeHandle()` function extracts the channel identifier from stored feed URLs (which use the old `feeds/videos.xml?channel_id=...` format) so we can construct the correct channel page URL.

4. **JSON response** — Instead of returning raw XML, the YouTube path returns structured JSON:
   ```json
   {
     "videos": [
       {
         "videoId": "abc123",
         "title": "Video Title",
         "published": "6 days ago",
         "thumbnail": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
         "description": "Video description..."
       }
     ]
   }
   ```

5. **Up to 30 videos** per channel are returned.

### Frontend Hook (`src/hooks/useNewsDeckFeeds.ts`)

1. **Updated `fetchYoutubeFeed`** — Now calls the edge function with `youtube=true` and parses the JSON response instead of XML.

2. **Added `parseRelativeDate()` helper** — YouTube returns relative timestamps ("6 days ago", "3 weeks ago") instead of ISO dates. This function converts them to proper ISO date strings for consistent sorting and display.

## Files Changed

- `supabase/functions/rss-proxy/index.ts` — Rewrote YouTube handling to scrape channel pages
- `src/hooks/useNewsDeckFeeds.ts` — Updated fetch logic and added relative date parser

## Database

No database changes required. The stored feed URLs (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) still work as identifiers — the channel ID is extracted from them to construct the scraping URL.

## Chronological Sort Fix (2026-04-04)

### Problem

Videos from multiple YouTube channels appeared in channel-grouped blocks instead of being interleaved chronologically. For example, all CNN videos would appear together, then all BBC videos, rather than being sorted by actual publish time across all channels.

### Root Cause

YouTube returns relative date strings ("6 days ago", "2 weeks ago") instead of precise timestamps. The frontend's `parseRelativeDate()` converted these, but all videos from one channel with the same relative date got identical timestamps. Since `flatMap` processes channels sequentially, same-timestamp videos stayed grouped by channel.

### Solution

Moved date parsing from the frontend to the backend edge function (`rss-proxy`):

1. **New `relativeTextToISO()` function in `rss-proxy/index.ts`** — Converts relative date strings to ISO timestamps server-side, with a per-video offset (`index * 60000ms`) so that videos within the same relative-date bucket get unique, correctly-ordered timestamps.

2. **Backend now returns ISO timestamps** — The `published` field in the JSON response is now a proper ISO date string (e.g., `"2026-03-29T14:30:00.000Z"`) instead of a relative string (e.g., `"6 days ago"`).

3. **Frontend uses ISO timestamps directly** — `useNewsDeckFeeds.ts` now uses the backend-provided ISO timestamp as-is, with a fallback to the old `parseRelativeDate()` for backward compatibility.

4. **No sort logic changes needed** — The existing chronological sort in `FeedColumn.tsx` now naturally interleaves videos from all channels since timestamps are unique and accurate.

### Files Changed

- `supabase/functions/rss-proxy/index.ts` — Added `relativeTextToISO()`, updated `fetchYoutubeChannel()` to return ISO dates
- `src/hooks/useNewsDeckFeeds.ts` — Updated `fetchYoutubeFeed` to use ISO timestamps directly with fallback

## Notes

- The old `resolveYoutubeUrl()` function was removed since we no longer need to resolve handles to RSS feed URLs.
- The `resolve_yt=true` endpoint still works for resolving YouTube handles to channel IDs (used when adding new YouTube channels).
- If YouTube changes their page structure or `ytInitialData` format in the future, the scraping logic in `fetchYoutubeChannel()` will need to be updated.
- RSS feeds for non-YouTube sources (standard RSS/Atom) are unaffected by this change.
