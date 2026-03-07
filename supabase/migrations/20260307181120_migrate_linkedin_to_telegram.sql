/*
  # Migrate LinkedIn feeds to Telegram

  1. Changes
    - Converts all existing 'linkedin' feed rows to 'telegram' type
    - Adds new `valid_feed_type` constraint allowing 'telegram', 'rss', 'youtube'

  2. Important Notes
    - No data is deleted; linkedin feeds are converted to telegram type
    - Users will need to update their feed URLs to Telegram channel URLs
*/

UPDATE user_news_feeds SET feed_type = 'telegram' WHERE feed_type = 'linkedin';

ALTER TABLE user_news_feeds ADD CONSTRAINT valid_feed_type CHECK (feed_type IN ('telegram', 'rss', 'youtube'));
