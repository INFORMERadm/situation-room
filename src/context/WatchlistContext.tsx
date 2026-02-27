import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface WatchlistEntry {
  symbol: string;
  name: string;
}

export interface Watchlist {
  id: string;
  name: string;
  sort_order: number;
  items: WatchlistEntry[];
}

interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  activeWatchlist: Watchlist | null;
  isLoading: boolean;
  createWatchlist: (name: string) => Promise<void>;
  renameWatchlist: (id: string, name: string) => Promise<void>;
  deleteWatchlist: (id: string) => Promise<void>;
  setActiveWatchlistId: (id: string) => void;
  addToActiveWatchlist: (symbol: string, name: string) => Promise<void>;
  removeFromActiveWatchlist: (symbol: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistState | null>(null);

const LOCAL_KEY = 'global-monitor-multi-watchlists';
const LOCAL_ACTIVE_KEY = 'global-monitor-active-watchlist';

const DEFAULT_WATCHLIST_ITEMS: WatchlistEntry[] = [
  { symbol: 'EURUSD', name: 'EUR/USD' },
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: '^DJI', name: 'Dow Jones Industrial' },
  { symbol: '^IXIC', name: 'Nasdaq Composite' },
  { symbol: 'ESUSD', name: 'S&P 500 E-mini' },
  { symbol: 'CLUSD', name: 'Crude Oil (WTI)' },
  { symbol: 'NGUSD', name: 'Natural Gas' },
  { symbol: 'GCUSD', name: 'Gold' },
  { symbol: 'SIUSD', name: 'Silver' },
  { symbol: 'HGUSD', name: 'Copper' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

function genLocalId() {
  return 'local-' + Math.random().toString(36).slice(2, 11);
}

function loadLocalWatchlists(): Watchlist[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const defaultList: Watchlist = {
    id: genLocalId(),
    name: 'My Watchlist',
    sort_order: 0,
    items: DEFAULT_WATCHLIST_ITEMS,
  };
  saveLocalWatchlists([defaultList]);
  return [defaultList];
}

function saveLocalWatchlists(lists: Watchlist[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(lists));
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedForUserRef = useRef<string | null | undefined>(undefined);

  const loadFromSupabase = useCallback(async (userId: string) => {
    const { data: lists, error: listsError } = await supabase
      .from('watchlists')
      .select('id, name, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (listsError || !lists) return null;

    if (lists.length === 0) {
      const { data: newList, error: createError } = await supabase
        .from('watchlists')
        .insert({ user_id: userId, name: 'My Watchlist', sort_order: 0 })
        .select('id, name, sort_order')
        .single();

      if (createError || !newList) return null;

      const { error: itemsError } = await supabase
        .from('watchlist_items')
        .insert(
          DEFAULT_WATCHLIST_ITEMS.map((item, i) => ({
            watchlist_id: newList.id,
            symbol: item.symbol,
            name: item.name,
            position: i,
          }))
        );

      if (itemsError) return [{ ...newList, items: [] }];

      return [{ ...newList, items: DEFAULT_WATCHLIST_ITEMS }];
    }

    const result: Watchlist[] = await Promise.all(
      lists.map(async (list) => {
        const { data: items } = await supabase
          .from('watchlist_items')
          .select('symbol, name')
          .eq('watchlist_id', list.id)
          .order('position', { ascending: true });

        return {
          id: list.id,
          name: list.name,
          sort_order: list.sort_order,
          items: (items || []).map((it) => ({ symbol: it.symbol, name: it.name })),
        };
      })
    );

    return result;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (loadedForUserRef.current === (user?.id ?? null)) return;
    loadedForUserRef.current = user?.id ?? null;

    async function init() {
      setIsLoading(true);
      if (user) {
        const lists = await loadFromSupabase(user.id);
        if (lists) {
          setWatchlists(lists);
          const storedActive = localStorage.getItem(LOCAL_ACTIVE_KEY + '-' + user.id);
          const validActive = storedActive && lists.some((l) => l.id === storedActive)
            ? storedActive
            : lists[0]?.id ?? null;
          setActiveWatchlistIdState(validActive);
        } else {
          const local = loadLocalWatchlists();
          setWatchlists(local);
          setActiveWatchlistIdState(local[0]?.id ?? null);
        }
      } else {
        const local = loadLocalWatchlists();
        setWatchlists(local);
        const storedActive = localStorage.getItem(LOCAL_ACTIVE_KEY);
        const validActive = storedActive && local.some((l) => l.id === storedActive)
          ? storedActive
          : local[0]?.id ?? null;
        setActiveWatchlistIdState(validActive);
      }
      setIsLoading(false);
    }

    init();
  }, [user, authLoading, loadFromSupabase]);

  const activeWatchlistIdRef = useRef<string | null>(null);

  const setActiveWatchlistId = useCallback((id: string) => {
    activeWatchlistIdRef.current = id;
    setActiveWatchlistIdState(id);
    if (user) {
      localStorage.setItem(LOCAL_ACTIVE_KEY + '-' + user.id, id);
    } else {
      localStorage.setItem(LOCAL_ACTIVE_KEY, id);
    }
  }, [user]);

  useEffect(() => {
    activeWatchlistIdRef.current = activeWatchlistId;
  }, [activeWatchlistId]);

  const watchlistsRef = useRef<Watchlist[]>([]);
  useEffect(() => {
    watchlistsRef.current = watchlists;
  }, [watchlists]);

  const createWatchlist = useCallback(async (name: string) => {
    if (user) {
      const maxOrder = watchlistsRef.current.reduce((m, w) => Math.max(m, w.sort_order), -1);
      const { data, error } = await supabase
        .from('watchlists')
        .insert({ user_id: user.id, name, sort_order: maxOrder + 1 })
        .select('id, name, sort_order')
        .single();

      if (error || !data) return;
      const newList: Watchlist = { ...data, items: [] };
      setWatchlists((prev) => [...prev, newList]);
      watchlistsRef.current = [...watchlistsRef.current, newList];
      setActiveWatchlistId(newList.id);
    } else {
      const maxOrder = watchlistsRef.current.reduce((m, w) => Math.max(m, w.sort_order), -1);
      const newList: Watchlist = {
        id: genLocalId(),
        name,
        sort_order: maxOrder + 1,
        items: [],
      };
      const next = [...watchlistsRef.current, newList];
      setWatchlists(next);
      watchlistsRef.current = next;
      saveLocalWatchlists(next);
      setActiveWatchlistId(newList.id);
    }
  }, [user, setActiveWatchlistId]);

  const renameWatchlist = useCallback(async (id: string, name: string) => {
    if (user) {
      await supabase.from('watchlists').update({ name }).eq('id', id);
    }
    setWatchlists((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, name } : w);
      if (!user) saveLocalWatchlists(next);
      return next;
    });
  }, [user]);

  const deleteWatchlist = useCallback(async (id: string) => {
    if (user) {
      await supabase.from('watchlists').delete().eq('id', id);
    }
    setWatchlists((prev) => {
      const next = prev.filter((w) => w.id !== id);
      if (!user) saveLocalWatchlists(next);
      if (activeWatchlistId === id) {
        const newActive = next[0]?.id ?? null;
        setActiveWatchlistIdState(newActive);
        if (newActive) {
          if (user) {
            localStorage.setItem(LOCAL_ACTIVE_KEY + '-' + user.id, newActive);
          } else {
            localStorage.setItem(LOCAL_ACTIVE_KEY, newActive);
          }
        }
      }
      return next;
    });
  }, [user, activeWatchlistId]);

  const addToActiveWatchlist = useCallback(async (symbol: string, name: string) => {
    const currentActiveId = activeWatchlistIdRef.current;
    if (!currentActiveId) return;
    const current = watchlistsRef.current.find((w) => w.id === currentActiveId);
    if (!current || current.items.some((i) => i.symbol === symbol)) return;

    if (user) {
      const { error } = await supabase.from('watchlist_items').insert({
        watchlist_id: currentActiveId,
        symbol,
        name,
        position: current.items.length,
      });
      if (error) return;
    }

    setWatchlists((prev) => {
      const next = prev.map((w) =>
        w.id === currentActiveId
          ? { ...w, items: [...w.items, { symbol, name }] }
          : w
      );
      if (!user) saveLocalWatchlists(next);
      watchlistsRef.current = next;
      return next;
    });
  }, [user]);

  const removeFromActiveWatchlist = useCallback(async (symbol: string) => {
    const currentActiveId = activeWatchlistIdRef.current;
    if (!currentActiveId) return;

    if (user) {
      await supabase
        .from('watchlist_items')
        .delete()
        .eq('watchlist_id', currentActiveId)
        .eq('symbol', symbol);
    }

    setWatchlists((prev) => {
      const next = prev.map((w) =>
        w.id === currentActiveId
          ? { ...w, items: w.items.filter((i) => i.symbol !== symbol) }
          : w
      );
      if (!user) saveLocalWatchlists(next);
      watchlistsRef.current = next;
      return next;
    });
  }, [user]);

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) ?? null;

  const value: WatchlistState = {
    watchlists,
    activeWatchlistId,
    activeWatchlist,
    isLoading,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    setActiveWatchlistId,
    addToActiveWatchlist,
    removeFromActiveWatchlist,
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistState {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
