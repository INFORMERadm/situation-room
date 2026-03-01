import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CHANNEL_ORDER } from '../lib/liveTvChannels';

const STORAGE_KEY = 'liveTvSettings';

interface LiveTvSettings {
  channelOrder: string[];
  hiddenChannels: string[];
  selectedChannel: string;
  muted: boolean;
}

const DEFAULT_SETTINGS: LiveTvSettings = {
  channelOrder: DEFAULT_CHANNEL_ORDER,
  hiddenChannels: [],
  selectedChannel: 'bloomberg',
  muted: true,
};

function loadLocal(): LiveTvSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveLocal(s: LiveTvSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function useLiveTvSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<LiveTvSettings>(loadLocal);
  const [loaded, setLoaded] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_livetv_settings')
        .select('channel_order, hidden_channels, selected_channel, muted')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const s: LiveTvSettings = {
          channelOrder: Array.isArray(data.channel_order) && data.channel_order.length > 0
            ? data.channel_order
            : DEFAULT_CHANNEL_ORDER,
          hiddenChannels: Array.isArray(data.hidden_channels) ? data.hidden_channels : [],
          selectedChannel: data.selected_channel || 'bloomberg',
          muted: data.muted ?? true,
        };
        setSettings(s);
        saveLocal(s);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const persist = useCallback((next: LiveTvSettings) => {
    saveLocal(next);
    if (!userId || savingRef.current) return;
    savingRef.current = true;
    supabase
      .from('user_livetv_settings')
      .upsert({
        user_id: userId,
        channel_order: next.channelOrder,
        hidden_channels: next.hiddenChannels,
        selected_channel: next.selectedChannel,
        muted: next.muted,
        updated_at: new Date().toISOString(),
      })
      .then(() => { savingRef.current = false; });
  }, [userId]);

  const selectChannel = useCallback((id: string) => {
    setSettings(prev => {
      const next = { ...prev, selectedChannel: id };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleMute = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, muted: !prev.muted };
      persist(next);
      return next;
    });
  }, [persist]);

  const setChannelOrder = useCallback((order: string[]) => {
    setSettings(prev => {
      const next = { ...prev, channelOrder: order };
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleChannelVisibility = useCallback((channelId: string) => {
    setSettings(prev => {
      const hidden = prev.hiddenChannels.includes(channelId)
        ? prev.hiddenChannels.filter(id => id !== channelId)
        : [...prev.hiddenChannels, channelId];
      const next = { ...prev, hiddenChannels: hidden };
      if (prev.selectedChannel === channelId && hidden.includes(channelId)) {
        const visibleOrder = prev.channelOrder.filter(id => !hidden.includes(id));
        next.selectedChannel = visibleOrder[0] || DEFAULT_CHANNEL_ORDER[0];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const resetToDefaults = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS };
    setSettings(next);
    persist(next);
  }, [persist]);

  return {
    ...settings,
    loaded,
    selectChannel,
    toggleMute,
    setChannelOrder,
    toggleChannelVisibility,
    resetToDefaults,
  };
}
