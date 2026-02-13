import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { IndicatorConfig } from '../lib/indicators';
import { DEFAULT_INDICATORS } from '../lib/indicators';

const WATCHLIST_STORAGE_KEY = 'global-monitor-watchlist';
const WATCHLIST_VERSION_KEY = 'global-monitor-watchlist-v';
const CLOCKS_STORAGE_KEY = 'global-monitor-world-clocks';
const CURRENT_VERSION = '3';

const DEFAULT_WATCHLIST = [
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

const DEFAULT_CLOCKS = [
  { label: 'New York', zone: 'America/New_York' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' },
];

export interface WatchlistEntry {
  symbol: string;
  name: string;
}

export interface ClockEntry {
  label: string;
  zone: string;
}

export interface PlatformState {
  chartType: string;
  indicators: IndicatorConfig[];
  watchlist: WatchlistEntry[];
  clocks: ClockEntry[];
  rightPanelView: 'news' | 'economic';
  leftTab: string;
  setChartType: (type: string) => void;
  toggleIndicator: (id: string, enabled?: boolean) => void;
  setIndicators: (inds: IndicatorConfig[]) => void;
  addToWatchlist: (symbol: string, name: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setWatchlist: (list: WatchlistEntry[]) => void;
  addClock: (label: string, zone: string) => void;
  removeClock: (zone: string) => void;
  setClocks: (list: ClockEntry[]) => void;
  setRightPanelView: (view: 'news' | 'economic') => void;
  setLeftTab: (tab: string) => void;
}

const PlatformContext = createContext<PlatformState | null>(null);

function loadWatchlist(): WatchlistEntry[] {
  try {
    const version = localStorage.getItem(WATCHLIST_VERSION_KEY);
    if (version === CURRENT_VERSION) {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
    localStorage.setItem(WATCHLIST_VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
  } catch { /* ignore */ }
  return DEFAULT_WATCHLIST;
}

function loadClocks(): ClockEntry[] {
  try {
    const stored = localStorage.getItem(CLOCKS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_CLOCKS;
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [chartType, setChartTypeState] = useState('area');
  const [indicators, setIndicatorsState] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [watchlist, setWatchlistState] = useState<WatchlistEntry[]>(loadWatchlist);
  const [clocks, setClocksState] = useState<ClockEntry[]>(loadClocks);
  const [rightPanelView, setRightPanelView] = useState<'news' | 'economic'>('news');
  const [leftTab, setLeftTab] = useState('overview');

  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  const setChartType = useCallback((type: string) => {
    setChartTypeState(type);
  }, []);

  const toggleIndicator = useCallback((id: string, enabled?: boolean) => {
    setIndicatorsState(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, enabled: enabled !== undefined ? enabled : !i.enabled }
          : i
      )
    );
  }, []);

  const setIndicators = useCallback((inds: IndicatorConfig[]) => {
    setIndicatorsState(inds);
  }, []);

  const addToWatchlist = useCallback((symbol: string, name: string) => {
    setWatchlistState(prev => {
      if (prev.some(w => w.symbol === symbol)) return prev;
      const next = [...prev, { symbol, name }];
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlistState(prev => {
      const next = prev.filter(w => w.symbol !== symbol);
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setWatchlist = useCallback((list: WatchlistEntry[]) => {
    setWatchlistState(list);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  }, []);

  const addClock = useCallback((label: string, zone: string) => {
    setClocksState(prev => {
      if (prev.some(c => c.zone === zone)) return prev;
      const next = [...prev, { label, zone }];
      localStorage.setItem(CLOCKS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeClock = useCallback((zone: string) => {
    setClocksState(prev => {
      const next = prev.filter(c => c.zone !== zone);
      localStorage.setItem(CLOCKS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setClocks = useCallback((list: ClockEntry[]) => {
    setClocksState(list);
    localStorage.setItem(CLOCKS_STORAGE_KEY, JSON.stringify(list));
  }, []);

  const value: PlatformState = {
    chartType,
    indicators,
    watchlist,
    clocks,
    rightPanelView,
    leftTab,
    setChartType,
    toggleIndicator,
    setIndicators,
    addToWatchlist,
    removeFromWatchlist,
    setWatchlist,
    addClock,
    removeClock,
    setClocks,
    setRightPanelView,
    setLeftTab,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformState {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
