/*
  # Drop old feed type constraint

  1. Changes
    - Drops the existing `valid_feed_type` constraint to allow migration of linkedin -> telegram
*/

ALTER TABLE user_news_feeds DROP CONSTRAINT IF EXISTS valid_feed_type;
