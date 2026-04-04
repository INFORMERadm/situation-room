import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type FeedType = 'telegram' | 'rss' | 'youtube';
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
  telegramAlarmEnabled: boolean;
  setTelegramAlarmEnabled: (enabled: boolean) => void;
  newTelegramPostIds: Set<string>;
  addFeed: (feedType: FeedType, url: string, displayName: string, columnPosition: ColumnPosition) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  refreshFeedItems: (feedId: string) => Promise<void>;
}

function parseRelativeDate(text: string): string {
  if (!text) return new Date().toISOString();
  const now = Date.now();
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return new Date().toISOString();
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms: Record<string, number> = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
    week: 604800000,
    month: 2592000000,
    year: 31536000000,
  };
  return new Date(now - num * (ms[unit] || 0)).toISOString();
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

      const linkEls = entry.querySelectorAll('link');
      let link = '';
      for (let j = 0; j < linkEls.length; j++) {
        const rel = linkEls[j].getAttribute('rel');
        if (rel === 'alternate' || (!rel && !link)) {
          link = linkEls[j].getAttribute('href') || linkEls[j].textContent || '';
          if (rel === 'alternate') break;
        }
      }
      if (!link && linkEls.length > 0) {
        link = linkEls[0].getAttribute('href') || linkEls[0].textContent || '';
      }

      const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
      const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';

      const mediaGroup = entry.getElementsByTagName('media:group')[0]
        || entry.querySelector('group');
      let thumbnail: string | undefined;
      if (mediaGroup) {
        const thumbEl = mediaGroup.getElementsByTagName('media:thumbnail')[0]
          || mediaGroup.querySelector('thumbnail');
        thumbnail = thumbEl?.getAttribute('url') || undefined;
      }
      if (!thumbnail) {
        const ytVideoId = link.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (ytVideoId) {
          thumbnail = `https://i.ytimg.com/vi/${ytVideoId[1]}/hqdefault.jpg`;
        }
      }

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
  const [telegramAlarmEnabled, setTelegramAlarmEnabledState] = useState(() => {
    try { return localStorage.getItem('telegramAlarmEnabled') !== 'false'; } catch { return true; }
  });

  const setTelegramAlarmEnabled = useCallback((enabled: boolean) => {
    setTelegramAlarmEnabledState(enabled);
    try { localStorage.setItem('telegramAlarmEnabled', String(enabled)); } catch { /* noop */ }
  }, []);

  const [newTelegramPostIds, setNewTelegramPostIds] = useState<Set<string>>(new Set());
  const newPostTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

      if (cancelled) return;

      let feedList = (data || []) as NewsFeed[];

      const hasTelegram = feedList.some(f => f.feed_type === 'telegram');
      if (!hasTelegram) {
        const { data: inserted } = await supabase
          .from('user_news_feeds')
          .insert({
            user_id: userId,
            feed_type: 'telegram',
            url: 'https://t.me/s/RocketAlert',
            display_name: 'Rocket Alert',
            column_position: 'left',
          })
          .select()
          .maybeSingle();

        if (!cancelled && inserted) {
          feedList = [inserted as NewsFeed, ...feedList];
        }
      }

      if (!cancelled) {
        setFeeds(feedList);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const fetchTelegramFeed = useCallback(async (feed: NewsFeed): Promise<FeedItem[]> => {
    try {
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy?telegram=true&url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const posts: { id: string; text: string; date: string; images: string[] }[] = json.posts || [];
      return posts.map((p, i) => ({
        id: `${feed.id}-${p.id || i}`,
        feedId: feed.id,
        title: p.text.split('\n')[0]?.slice(0, 200) || 'Telegram Post',
        url: `${feed.url.replace('/s/', '/')}/${p.id}`,
        description: p.text.split('\n').slice(1).join('\n').slice(0, 500),
        publishedAt: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
        thumbnail: p.images[0] || undefined,
        source: feed.display_name,
      }));
    } catch {
      return [];
    }
  }, []);

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
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy?youtube=true&url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const videos: { videoId: string; title: string; published: string; thumbnail: string; description: string }[] = json.videos || [];
      return videos.map((v, i) => ({
        id: `${feed.id}-${v.videoId || i}`,
        feedId: feed.id,
        title: v.title || 'YouTube Video',
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        description: v.description || '',
        publishedAt: isNaN(Date.parse(v.published)) ? parseRelativeDate(v.published) : v.published,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        source: feed.display_name,
      }));
    } catch {
      return [];
    }
  }, []);

  const refreshFeedItems = useCallback(async (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return;

    setFetchingItems(true);
    let items: FeedItem[] = [];

    if (feed.feed_type === 'telegram') {
      items = await fetchTelegramFeed(feed);
    } else if (feed.feed_type === 'rss') {
      items = await fetchRssFeed(feed);
    } else if (feed.feed_type === 'youtube') {
      items = await fetchYoutubeFeed(feed);
    }

    setFeedItems(prev => ({ ...prev, [feedId]: items }));
    setFetchingItems(false);
  }, [feeds, fetchTelegramFeed, fetchRssFeed, fetchYoutubeFeed]);

  const refreshFeedsByType = useCallback(async (type: FeedType) => {
    const targetFeeds = feeds.filter(f => f.feed_type === type);
    if (targetFeeds.length === 0) return;

    const fetcher = type === 'telegram' ? fetchTelegramFeed : type === 'rss' ? fetchRssFeed : fetchYoutubeFeed;
    const results: Record<string, FeedItem[]> = {};
    await Promise.all(
      targetFeeds.map(async (feed) => {
        results[feed.id] = await fetcher(feed);
      })
    );
    setFeedItems(prev => ({ ...prev, ...results }));
  }, [feeds, fetchTelegramFeed, fetchRssFeed, fetchYoutubeFeed]);

  useEffect(() => {
    if (feeds.length === 0) return;

    const fetchableFeeds = feeds.filter(f => f.feed_type === 'telegram' || f.feed_type === 'rss' || f.feed_type === 'youtube');
    if (fetchableFeeds.length === 0) return;

    let cancelled = false;
    setFetchingItems(true);

    (async () => {
      const results: Record<string, FeedItem[]> = {};
      await Promise.all(
        fetchableFeeds.map(async (feed) => {
          let items: FeedItem[] = [];
          if (feed.feed_type === 'telegram') {
            items = await fetchTelegramFeed(feed);
          } else if (feed.feed_type === 'rss') {
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
  }, [feeds, fetchTelegramFeed, fetchRssFeed, fetchYoutubeFeed]);

  const telegramPostIdsRef = useRef<Set<string>>(new Set());
  const telegramInitialLoadDoneRef = useRef(false);
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);

  const playTelegramSiren = useCallback(() => {
    try {
      if (!sirenAudioRef.current) {
        sirenAudioRef.current = new Audio(
          'https://respective-chocolate-rwzrevkijv.edgeone.app/nuclear-siren-emergency-alarm-ra-music-1-00-11.mp3'
        );
        sirenAudioRef.current.volume = 0.7;
      }
      sirenAudioRef.current.currentTime = 0;
      sirenAudioRef.current.play().catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const tgFeeds = feeds.filter(f => f.feed_type === 'telegram');
    if (tgFeeds.length === 0) return;

    const allTgItems = tgFeeds.flatMap(f => feedItems[f.id] || []);
    const currentIds = new Set(allTgItems.map(item => item.id));

    if (!telegramInitialLoadDoneRef.current) {
      if (currentIds.size > 0) {
        telegramPostIdsRef.current = currentIds;
        telegramInitialLoadDoneRef.current = true;
      }
    } else {
      const newIds = [...currentIds].filter(id => !telegramPostIdsRef.current.has(id));
      if (newIds.length > 0) {
        if (telegramAlarmEnabled) playTelegramSiren();
        telegramPostIdsRef.current = currentIds;

        setNewTelegramPostIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.add(id));
          return next;
        });

        newIds.forEach(id => {
          const existing = newPostTimersRef.current.get(id);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            setNewTelegramPostIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            newPostTimersRef.current.delete(id);
          }, 6000);
          newPostTimersRef.current.set(id, timer);
        });
      }
    }
  }, [feeds, feedItems, playTelegramSiren, telegramAlarmEnabled]);

  useEffect(() => {
    const tgFeeds = feeds.filter(f => f.feed_type === 'telegram');
    if (tgFeeds.length === 0) return;

    const interval = setInterval(() => {
      refreshFeedsByType('telegram');
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [feeds, refreshFeedsByType]);

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

    let resolvedUrl = url;
    if (feedType === 'youtube') {
      try {
        const parsed = new URL(url);
        if (
          (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') &&
          !parsed.pathname.startsWith('/feeds/videos.xml')
        ) {
          const channelMatch = parsed.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)/);
          if (channelMatch) {
            resolvedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
          } else {
            const handleMatch = parsed.pathname.match(/^\/@([a-zA-Z0-9_.-]+)/);
            if (handleMatch) {
              const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rss-proxy?resolve_yt=true&handle=${encodeURIComponent(handleMatch[1])}`;
              const res = await fetch(proxyUrl, {
                headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              });
              if (res.ok) {
                const json = await res.json();
                if (json.feedUrl) resolvedUrl = json.feedUrl;
              }
            }
          }
        }
      } catch {
        // keep original url
      }
    }

    const { data, error } = await supabase
      .from('user_news_feeds')
      .insert({
        user_id: userId,
        feed_type: feedType,
        url: resolvedUrl,
        display_name: displayName,
        column_position: columnPosition,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      const newFeed = data as NewsFeed;
      setFeeds(prev => [...prev, newFeed]);

      let items: FeedItem[] = [];
      if (feedType === 'telegram') items = await fetchTelegramFeed(newFeed);
      else if (feedType === 'rss') items = await fetchRssFeed(newFeed);
      else if (feedType === 'youtube') items = await fetchYoutubeFeed(newFeed);
      if (items.length > 0) {
        setFeedItems(prev => ({ ...prev, [newFeed.id]: items }));
      }
    }
  }, [userId, fetchTelegramFeed, fetchRssFeed, fetchYoutubeFeed]);

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

  return { feeds, feedItems, loading, fetchingItems, telegramAlarmEnabled, setTelegramAlarmEnabled, newTelegramPostIds, addFeed, removeFeed, refreshFeedItems };
}
