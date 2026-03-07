import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type FeedType = 'linkedin' | 'rss' | 'youtube';
export type ColumnPosition = 'left' | 'center' | 'right';

export interface NewsFeed {
  id: string;
  user_id: string;
  feed_type: FeedType;
  url: string;
  display_name: string;
  column_position: ColumnPosition;
  created_at: string;
}

export interface FeedItem {
  id: string;
  feedId: string;
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  thumbnail?: string;
  source: string;
}

interface UseNewsDeckFeedsReturn {
  feeds: NewsFeed[];
  feedItems: Record<string, FeedItem[]>;
  loading: boolean;
  fetchingItems: boolean;
  addFeed: (feedType: FeedType, url: string, displayName: string, columnPosition: ColumnPosition) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  refreshFeedItems: (feedId: string) => Promise<void>;
}

function parseRssXml(xml: string, feedId: string, source: string): FeedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items: FeedItem[] = [];

  const rssItems = doc.querySelectorAll('item');
  if (rssItems.length > 0) {
    rssItems.forEach((item, i) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const desc = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const enclosure = item.querySelector('enclosure');
      const mediaThumb = item.querySelector('thumbnail');
      const thumbnail = enclosure?.getAttribute('url') || mediaThumb?.getAttribute('url') || undefined;

      items.push({
        id: `${feedId}-${i}`,
        feedId,
        title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
        url: link,
        description: desc.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ''),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        thumbnail,
        source,
      });
    });
  } else {
    const entries = doc.querySelectorAll('entry');
    entries.forEach((entry, i) => {
      const title = entry.querySelector('title')?.textContent || '';
      const linkEl = entry.querySelector('link');
      const link = linkEl?.getAttribute('href') || linkEl?.textContent || '';
      const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
      const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
      const mediaGroup = entry.querySelector('group');
      const thumbnail = mediaGroup?.querySelector('thumbnail')?.getAttribute('url') || undefined;

      items.push({
        id: `${feedId}-${i}`,
        feedId,
        title,
        url: link,
        description: summary.replace(/<[^>]+>/g, ''),
        publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
        thumbnail,
        source,
      });
    });
  }

  return items.slice(0, 50);
}

export function useNewsDeckFeeds(userId: string | undefined): UseNewsDeckFeedsReturn {
  const [feeds, setFeeds] = useState<NewsFeed[]>([]);
  const [feedItems, setFeedItems] = useState<Record<string, FeedItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingItems, setFetchingItems] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_news_feeds')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        setFeeds(data as NewsFeed[]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const fetchRssFeed = useCallback(async (feed: NewsFeed) => {
    try {
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy?url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssXml(xml, feed.id, feed.display_name);
    } catch {
      return [];
    }
  }, []);

  const fetchYoutubeFeed = useCallback(async (feed: NewsFeed) => {
    try {
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy?url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssXml(xml, feed.id, feed.display_name);
    } catch {
      return [];
    }
  }, []);

  const refreshFeedItems = useCallback(async (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return;

    setFetchingItems(true);
    let items: FeedItem[] = [];

    if (feed.feed_type === 'rss') {
      items = await fetchRssFeed(feed);
    } else if (feed.feed_type === 'youtube') {
      items = await fetchYoutubeFeed(feed);
    }

    setFeedItems(prev => ({ ...prev, [feedId]: items }));
    setFetchingItems(false);
  }, [feeds, fetchRssFeed, fetchYoutubeFeed]);

  const refreshFeedsByType = useCallback(async (type: FeedType) => {
    const targetFeeds = feeds.filter(f => f.feed_type === type);
    if (targetFeeds.length === 0) return;

    const fetcher = type === 'rss' ? fetchRssFeed : fetchYoutubeFeed;
    const results: Record<string, FeedItem[]> = {};
    await Promise.all(
      targetFeeds.map(async (feed) => {
        results[feed.id] = await fetcher(feed);
      })
    );
    setFeedItems(prev => ({ ...prev, ...results }));
  }, [feeds, fetchRssFeed, fetchYoutubeFeed]);

  useEffect(() => {
    if (feeds.length === 0) return;

    const fetchableFeeds = feeds.filter(f => f.feed_type === 'rss' || f.feed_type === 'youtube');
    if (fetchableFeeds.length === 0) return;

    let cancelled = false;
    setFetchingItems(true);

    (async () => {
      const results: Record<string, FeedItem[]> = {};
      await Promise.all(
        fetchableFeeds.map(async (feed) => {
          let items: FeedItem[] = [];
          if (feed.feed_type === 'rss') {
            items = await fetchRssFeed(feed);
          } else if (feed.feed_type === 'youtube') {
            items = await fetchYoutubeFeed(feed);
          }
          results[feed.id] = items;
        })
      );
      if (!cancelled) {
        setFeedItems(prev => ({ ...prev, ...results }));
        setFetchingItems(false);
      }
    })();

    return () => { cancelled = true; };
  }, [feeds, fetchRssFeed, fetchYoutubeFeed]);

  useEffect(() => {
    const rssFeeds = feeds.filter(f => f.feed_type === 'rss');
    if (rssFeeds.length === 0) return;

    const interval = setInterval(() => {
      refreshFeedsByType('rss');
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [feeds, refreshFeedsByType]);

  useEffect(() => {
    const ytFeeds = feeds.filter(f => f.feed_type === 'youtube');
    if (ytFeeds.length === 0) return;

    const interval = setInterval(() => {
      refreshFeedsByType('youtube');
    }, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, [feeds, refreshFeedsByType]);

  const addFeed = useCallback(async (feedType: FeedType, url: string, displayName: string, columnPosition: ColumnPosition) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_news_feeds')
      .insert({
        user_id: userId,
        feed_type: feedType,
        url,
        display_name: displayName,
        column_position: columnPosition,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      const newFeed = data as NewsFeed;
      setFeeds(prev => [...prev, newFeed]);

      if (feedType === 'rss' || feedType === 'youtube') {
        let items: FeedItem[] = [];
        if (feedType === 'rss') items = await fetchRssFeed(newFeed);
        else items = await fetchYoutubeFeed(newFeed);
        setFeedItems(prev => ({ ...prev, [newFeed.id]: items }));
      }
    }
  }, [userId, fetchRssFeed, fetchYoutubeFeed]);

  const removeFeed = useCallback(async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('user_news_feeds')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      setFeeds(prev => prev.filter(f => f.id !== id));
      setFeedItems(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [userId]);

  return { feeds, feedItems, loading, fetchingItems, addFeed, removeFeed, refreshFeedItems };
}
