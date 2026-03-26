import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { playAlertNotification } from '../lib/alarmSound';
import { showDesktopNotification, requestNotificationPermission } from './useMessageNotifications';
import type { MarketNewsItem } from '../types';
import type { FeedItem } from './useNewsDeckFeeds';

export interface UserAlert {
  id: string;
  user_id: string;
  alert_type: 'keyword' | 'price';
  name: string;
  keywords: string[];
  symbol: string | null;
  price_condition: 'above' | 'below' | null;
  price_target: number | null;
  enabled: boolean;
  last_triggered_at: string | null;
  natural_language_query: string | null;
  created_at: string;
}

export interface NewAlertInput {
  alert_type: 'keyword' | 'price';
  name: string;
  keywords?: string[];
  symbol?: string;
  price_condition?: 'above' | 'below';
  price_target?: number;
  natural_language_query?: string;
}

const TRIGGER_COOLDOWN_MS = 5 * 60 * 1000;

export function useAlerts(
  userId: string | undefined,
  newsItems: MarketNewsItem[],
  feedItems: Record<string, FeedItem[]>,
  quotes: Record<string, { price: number }>,
) {
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const triggeredRef = useRef<Map<string, number>>(new Map());
  const prevNewsRef = useRef<Set<string>>(new Set());
  const prevFeedRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setAlerts(data as UserAlert[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const addAlert = useCallback(async (input: NewAlertInput) => {
    if (!userId) return null;
    requestNotificationPermission();
    const { data, error } = await supabase
      .from('user_alerts')
      .insert({
        user_id: userId,
        alert_type: input.alert_type,
        name: input.name,
        keywords: input.keywords || [],
        symbol: input.symbol || null,
        price_condition: input.price_condition || null,
        price_target: input.price_target ?? null,
        natural_language_query: input.natural_language_query || null,
      })
      .select()
      .maybeSingle();
    if (data) {
      setAlerts(prev => [data as UserAlert, ...prev]);
      return data as UserAlert;
    }
    if (error) console.error('[alerts] insert error:', error);
    return null;
  }, [userId]);

  const updateAlert = useCallback(async (id: string, updates: Partial<Pick<UserAlert, 'name' | 'keywords' | 'symbol' | 'price_condition' | 'price_target' | 'enabled'>>) => {
    const { error } = await supabase
      .from('user_alerts')
      .update(updates)
      .eq('id', id);
    if (!error) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  }, []);

  const deleteAlert = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('user_alerts')
      .delete()
      .eq('id', id);
    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }
  }, []);

  const toggleAlert = useCallback(async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    await updateAlert(id, { enabled: !alert.enabled });
  }, [alerts, updateAlert]);

  const triggerAlert = useCallback((alert: UserAlert, matchInfo: string) => {
    const now = Date.now();
    const lastTriggered = triggeredRef.current.get(alert.id) || 0;
    if (now - lastTriggered < TRIGGER_COOLDOWN_MS) return;

    triggeredRef.current.set(alert.id, now);
    playAlertNotification();

    const title = alert.alert_type === 'keyword' ? 'Keyword Alert' : 'Price Alert';
    showDesktopNotification(title, `${alert.name}: ${matchInfo}`);

    supabase
      .from('user_alerts')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', alert.id)
      .then(() => {
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, last_triggered_at: new Date().toISOString() } : a));
      });
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      const newsUrls = new Set<string>();
      newsItems.forEach(n => newsUrls.add(n.url));
      Object.values(feedItems).forEach(items => items.forEach(fi => newsUrls.add(fi.id)));
      prevNewsRef.current = newsUrls;
      const feedIds = new Set<string>();
      Object.values(feedItems).forEach(items => items.forEach(fi => feedIds.add(fi.id)));
      prevFeedRef.current = feedIds;
      initialLoadDone.current = true;
      return;
    }

    const enabledKeywordAlerts = alerts.filter(a => a.enabled && a.alert_type === 'keyword' && a.keywords.length > 0);
    if (enabledKeywordAlerts.length === 0) return;

    const newNewsItems = newsItems.filter(n => !prevNewsRef.current.has(n.url));
    const newFeedItems: FeedItem[] = [];
    Object.values(feedItems).forEach(items => {
      items.forEach(fi => {
        if (!prevFeedRef.current.has(fi.id)) newFeedItems.push(fi);
      });
    });

    if (newNewsItems.length === 0 && newFeedItems.length === 0) return;

    for (const alert of enabledKeywordAlerts) {
      const lowerKeywords = alert.keywords.map(k => k.toLowerCase());

      for (const news of newNewsItems) {
        const text = `${news.title} ${news.site}`.toLowerCase();
        const matched = lowerKeywords.find(kw => text.includes(kw));
        if (matched) {
          triggerAlert(alert, news.title);
          break;
        }
      }

      for (const fi of newFeedItems) {
        const text = `${fi.title} ${fi.description} ${fi.source}`.toLowerCase();
        const matched = lowerKeywords.find(kw => text.includes(kw));
        if (matched) {
          triggerAlert(alert, fi.title);
          break;
        }
      }
    }

    const nextNewsUrls = new Set(prevNewsRef.current);
    newNewsItems.forEach(n => nextNewsUrls.add(n.url));
    prevNewsRef.current = nextNewsUrls;

    const nextFeedIds = new Set(prevFeedRef.current);
    newFeedItems.forEach(fi => nextFeedIds.add(fi.id));
    prevFeedRef.current = nextFeedIds;
  }, [newsItems, feedItems, alerts, triggerAlert]);

  useEffect(() => {
    const enabledPriceAlerts = alerts.filter(a => a.enabled && a.alert_type === 'price' && a.symbol && a.price_target !== null);
    if (enabledPriceAlerts.length === 0) return;

    for (const alert of enabledPriceAlerts) {
      const sym = alert.symbol!.toUpperCase();
      const q = quotes[sym];
      if (!q) continue;

      const price = q.price;
      const target = alert.price_target!;

      if (alert.price_condition === 'above' && price >= target) {
        triggerAlert(alert, `${sym} reached $${price.toFixed(2)} (target: above $${target.toFixed(2)})`);
      } else if (alert.price_condition === 'below' && price <= target) {
        triggerAlert(alert, `${sym} dropped to $${price.toFixed(2)} (target: below $${target.toFixed(2)})`);
      }
    }
  }, [quotes, alerts, triggerAlert]);

  return {
    alerts,
    loading,
    addAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    refreshAlerts: loadAlerts,
  };
}
