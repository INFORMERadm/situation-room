import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSymbolSearch, fetchBatchQuotes } from '../../lib/api';
import type { SearchResult, QuoteDetail } from '../../types';

interface Props {
  onSelect: (symbol: string) => void;
}

type FlashDirection = 'up' | 'down' | null;

const STORAGE_KEY = 'global-monitor-watchlist';

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

interface WatchlistEntry {
  symbol: string;
  name: string;
}

const WATCHLIST_VERSION_KEY = 'global-monitor-watchlist-v';
const CURRENT_VERSION = '3';

const FOREX_SYMBOLS = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']);

function loadWatchlist(): WatchlistEntry[] {
  try {
    const version = localStorage.getItem(WATCHLIST_VERSION_KEY);
    if (version === CURRENT_VERSION) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
    localStorage.setItem(WATCHLIST_VERSION_KEY, CURRENT_VERSION);
    saveWatchlist(DEFAULT_WATCHLIST);
  } catch {}
  return DEFAULT_WATCHLIST;
}

function saveWatchlist(list: WatchlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function MarketOverview({ onSelect }: Props) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(loadWatchlist);
  const [quotes, setQuotes] = useState<Record<string, QuoteDetail>>({});
  const [flashes, setFlashes] = useState<Record<string, FlashDirection>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const refreshQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    try {
      const batch = await fetchBatchQuotes(symbols) as Record<string, QuoteDetail>;

      const newFlashes: Record<string, FlashDirection> = {};
      for (const [sym, q] of Object.entries(batch)) {
        const prev = prevPricesRef.current[sym];
        if (prev !== undefined && q.price !== prev) {
          newFlashes[sym] = q.price > prev ? 'up' : 'down';
        }
        prevPricesRef.current[sym] = q.price;
      }

      if (Object.keys(newFlashes).length > 0) {
        setFlashes((prev) => ({ ...prev, ...newFlashes }));
        for (const sym of Object.keys(newFlashes)) {
          if (flashTimersRef.current[sym]) clearTimeout(flashTimersRef.current[sym]);
          flashTimersRef.current[sym] = setTimeout(() => {
            setFlashes((prev) => {
              const next = { ...prev };
              delete next[sym];
              return next;
            });
          }, 1200);
        }
      }

      setQuotes((prev) => ({ ...prev, ...batch }));
    } catch {}
  }, []);

  useEffect(() => {
    const symbols = watchlist.map((w) => w.symbol);
    refreshQuotes(symbols);
    const interval = setInterval(() => refreshQuotes(symbols), 3_000);
    return () => clearInterval(interval);
  }, [watchlist, refreshQuotes]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await fetchSymbolSearch(searchQuery);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const addInstrument = (result: SearchResult) => {
    if (watchlist.some((w) => w.symbol === result.symbol)) return;
    const next = [...watchlist, { symbol: result.symbol, name: result.name }];
    setWatchlist(next);
    saveWatchlist(next);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    refreshQuotes([result.symbol]);
  };

  const removeInstrument = (symbol: string) => {
    const next = watchlist.filter((w) => w.symbol !== symbol);
    setWatchlist(next);
    saveWatchlist(next);
  };

  const activeSymbols = new Set(watchlist.map((w) => w.symbol));
  const filteredResults = searchResults.filter(
    (r) => !activeSymbols.has(r.symbol),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid #292929',
        }}
      >
        <span
          style={{
            color: '#888',
            fontSize: 10,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Watchlist ({watchlist.length})
        </span>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            background: showSearch ? '#1a1a1a' : 'transparent',
            border: '1px solid #292929',
            borderRadius: 3,
            color: '#888',
            width: 22,
            height: 22,
            fontSize: 14,
            lineHeight: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00c853';
            e.currentTarget.style.color = '#00c853';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#292929';
            e.currentTarget.style.color = '#888';
          }}
        >
          +
        </button>
      </div>

      {showSearch && (
        <div ref={searchContainerRef} style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderBottom: '1px solid #292929',
              background: '#0d0d0d',
            }}
          >
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol to add..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e0e0e0',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
            {searchLoading && (
              <span style={{ color: '#555', fontSize: 10 }}>...</span>
            )}
          </div>
          {filteredResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #292929',
                borderTop: 'none',
                zIndex: 100,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {filteredResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => addInstrument(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #222',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#252525')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        color: '#00c853',
                        fontSize: 11,
                        fontWeight: 600,
                        minWidth: 50,
                        textAlign: 'left',
                      }}
                    >
                      {r.symbol}
                    </span>
                    <span
                      style={{
                        color: '#999',
                        fontSize: 10,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 140,
                        textAlign: 'left',
                      }}
                    >
                      {r.name}
                    </span>
                  </div>
                  <span style={{ color: '#555', fontSize: 9 }}>
                    {r.exchange}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {watchlist.length === 0 && (
          <div
            style={{
              padding: 24,
              color: '#555',
              fontSize: 11,
              textAlign: 'center',
            }}
          >
            No instruments added. Click + to add.
          </div>
        )}
        {watchlist.map((item) => {
          const q = quotes[item.symbol];
          const isUp = q ? q.changesPercentage >= 0 : true;
          const color = isUp ? '#00c853' : '#ff1744';
          const flash = flashes[item.symbol];
          const flashBg = flash === 'up'
            ? 'rgba(0, 200, 83, 0.15)'
            : flash === 'down'
              ? 'rgba(255, 23, 68, 0.15)'
              : 'transparent';
          return (
            <button
              key={item.symbol}
              onClick={() => onSelect(item.symbol)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 8,
                alignItems: 'center',
                width: '100%',
                padding: '6px 12px',
                background: flashBg,
                border: 'none',
                borderBottom: '1px solid #1e1e1e',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.6s ease-out',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!flash) e.currentTarget.style.background = '#1a1a1a';
                const btn = e.currentTarget.querySelector(
                  '[data-remove]',
                ) as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (!flash) e.currentTarget.style.background = 'transparent';
                const btn = e.currentTarget.querySelector(
                  '[data-remove]',
                ) as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div
                  style={{ color: '#ccc', fontSize: 11, fontWeight: 600 }}
                >
                  {item.symbol}
                </div>
                <div
                  style={{
                    color: '#555',
                    fontSize: 9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </div>
              </div>
              <span
                style={{
                  color: flash === 'up' ? '#00c853' : flash === 'down' ? '#ff1744' : '#ccc',
                  fontSize: 11,
                  textAlign: 'right',
                  transition: 'color 0.6s ease-out',
                }}
              >
                {q
                  ? FOREX_SYMBOLS.has(item.symbol)
                    ? q.price.toFixed(4)
                    : `$${q.price.toFixed(2)}`
                  : '--'}
              </span>
              <span
                style={{
                  color: q ? color : '#555',
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'right',
                  minWidth: 65,
                }}
              >
                {q
                  ? `${isUp ? '+' : ''}${q.changesPercentage.toFixed(2)}%`
                  : '--'}
              </span>
              <span
                data-remove
                onClick={(e) => {
                  e.stopPropagation();
                  removeInstrument(item.symbol);
                }}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#ff4757',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 14,
                  height: 14,
                  fontSize: 9,
                  lineHeight: '14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                x
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
