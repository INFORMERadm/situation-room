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

## Notes

- The old `resolveYoutubeUrl()` function was removed since we no longer need to resolve handles to RSS feed URLs.
- The `resolve_yt=true` endpoint still works for resolving YouTube handles to channel IDs (used when adding new YouTube channels).
- If YouTube changes their page structure or `ytInitialData` format in the future, the scraping logic in `fetchYoutubeChannel()` will need to be updated.
- RSS feeds for non-YouTube sources (standard RSS/Atom) are unaffected by this change.
