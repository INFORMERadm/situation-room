import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSymbolSearch, fetchBatchQuotes } from '../../lib/api';
import type { SearchResult, QuoteDetail } from '../../types';
import { isForexSymbol } from '../../lib/format';
import { useWatchlist } from '../../context/WatchlistContext';
import type { Watchlist } from '../../context/WatchlistContext';

interface Props {
  onSelect: (symbol: string) => void;
}

type FlashDirection = 'up' | 'down' | null;

export default function MarketOverview({ onSelect }: Props) {
  const {
    watchlists,
    activeWatchlistId,
    activeWatchlist,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    setActiveWatchlistId,
    addToActiveWatchlist,
    removeFromActiveWatchlist,
  } = useWatchlist();

  const [quotes, setQuotes] = useState<Record<string, QuoteDetail>>({});
  const [flashes, setFlashes] = useState<Record<string, FlashDirection>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const newNameInputRef = useRef<HTMLInputElement>(null!) as React.MutableRefObject<HTMLInputElement>;

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null!) as React.MutableRefObject<HTMLInputElement>;

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const watchlistItems = activeWatchlist?.items ?? [];

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
    const symbols = watchlistItems.map((w) => w.symbol);
    refreshQuotes(symbols);
    const interval = setInterval(() => refreshQuotes(symbols), 3_000);
    return () => clearInterval(interval);
  }, [watchlistItems, refreshQuotes]);

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
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  useEffect(() => {
    if (creatingNew && newNameInputRef.current) newNameInputRef.current.focus();
  }, [creatingNew]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  const addInstrument = (result: SearchResult) => {
    if (watchlistItems.some((w) => w.symbol === result.symbol)) return;
    addToActiveWatchlist(result.symbol, result.name);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    refreshQuotes([result.symbol]);
  };

  const removeInstrument = (symbol: string) => {
    removeFromActiveWatchlist(symbol);
  };

  const handleCreateSubmit = async () => {
    const name = newName.trim();
    if (name) await createWatchlist(name);
    setCreatingNew(false);
    setNewName('');
  };

  const handleRenameSubmit = async (id: string) => {
    const name = renameValue.trim();
    if (name) await renameWatchlist(id, name);
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDeleteConfirm = async (id: string) => {
    if (watchlists.length <= 1) return;
    await deleteWatchlist(id);
    setDeleteConfirmId(null);
  };

  const activeSymbols = new Set(watchlistItems.map((w) => w.symbol));
  const filteredResults = searchResults.filter((r) => !activeSymbols.has(r.symbol));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <WatchlistTabs
        watchlists={watchlists}
        activeId={activeWatchlistId}
        renamingId={renamingId}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        deleteConfirmId={deleteConfirmId}
        creatingNew={creatingNew}
        newName={newName}
        newNameInputRef={newNameInputRef}
        onSelect={setActiveWatchlistId}
        onRenameStart={(w) => { setRenamingId(w.id); setRenameValue(w.name); }}
        onRenameChange={setRenameValue}
        onRenameSubmit={handleRenameSubmit}
        onRenameCancel={() => { setRenamingId(null); setRenameValue(''); }}
        onDeleteStart={(id) => setDeleteConfirmId(id)}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={() => setDeleteConfirmId(null)}
        onNewNameChange={setNewName}
        onNewSubmit={handleCreateSubmit}
        onNewCancel={() => { setCreatingNew(false); setNewName(''); }}
        onAddNew={() => setCreatingNew(true)}
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 12px',
        borderBottom: '1px solid #292929',
      }}>
        <span style={{ color: '#aaa', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {activeWatchlist?.name ?? 'Watchlist'} ({watchlistItems.length})
        </span>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            background: showSearch ? '#1a1a1a' : 'transparent',
            border: '1px solid #292929',
            borderRadius: 3,
            color: '#aaa',
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
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00c853'; e.currentTarget.style.color = '#00c853'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}
        >
          +
        </button>
      </div>

      {showSearch && (
        <div ref={searchContainerRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderBottom: '1px solid #292929',
            background: '#0d0d0d',
          }}>
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
            {searchLoading && <span style={{ color: '#888', fontSize: 10 }}>...</span>}
          </div>
          {filteredResults.length > 0 && (
            <div style={{
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
            }}>
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#00c853', fontSize: 11, fontWeight: 600, minWidth: 50, textAlign: 'left' }}>
                      {r.symbol}
                    </span>
                    <span style={{
                      color: '#999', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: 140, textAlign: 'left',
                    }}>
                      {r.name}
                    </span>
                  </div>
                  <span style={{ color: '#888', fontSize: 9 }}>{r.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {watchlistItems.length === 0 && (
          <div style={{ padding: 24, color: '#888', fontSize: 11, textAlign: 'center' }}>
            No instruments added. Click + to add.
          </div>
        )}
        {watchlistItems.map((item) => {
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
                const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (!flash) e.currentTarget.style.background = 'transparent';
                const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ color: '#ccc', fontSize: 11, fontWeight: 600 }}>{item.symbol}</div>
                <div style={{ color: '#888', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
              </div>
              <span style={{
                color: flash === 'up' ? '#00c853' : flash === 'down' ? '#ff1744' : '#ccc',
                fontSize: 11,
                textAlign: 'right',
                transition: 'color 0.6s ease-out',
              }}>
                {q ? (isForexSymbol(item.symbol) ? q.price.toFixed(4) : `$${q.price.toFixed(2)}`) : '--'}
              </span>
              <span style={{ color: q ? color : '#888', fontSize: 11, fontWeight: 600, textAlign: 'right', minWidth: 65 }}>
                {q ? `${isUp ? '+' : ''}${q.changesPercentage.toFixed(2)}%` : '--'}
              </span>
              <span
                data-remove
                onClick={(e) => { e.stopPropagation(); removeInstrument(item.symbol); }}
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

interface TabsProps {
  watchlists: Watchlist[];
  activeId: string | null;
  renamingId: string | null;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  deleteConfirmId: string | null;
  creatingNew: boolean;
  newName: string;
  newNameInputRef: React.RefObject<HTMLInputElement>;
  onSelect: (id: string) => void;
  onRenameStart: (w: Watchlist) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onDeleteStart: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  onNewNameChange: (v: string) => void;
  onNewSubmit: () => void;
  onNewCancel: () => void;
  onAddNew: () => void;
}

function WatchlistTabs({
  watchlists, activeId, renamingId, renameValue, renameInputRef,
  deleteConfirmId, creatingNew, newName, newNameInputRef,
  onSelect, onRenameStart, onRenameChange, onRenameSubmit, onRenameCancel,
  onDeleteStart, onDeleteConfirm, onDeleteCancel,
  onNewNameChange, onNewSubmit, onNewCancel, onAddNew,
}: TabsProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #292929',
      background: '#080808',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      minHeight: 32,
      flexShrink: 0,
    }}>
      {watchlists.map((w) => {
        const isActive = w.id === activeId;
        const isRenaming = renamingId === w.id;
        const isDeleteConfirm = deleteConfirmId === w.id;

        if (isDeleteConfirm) {
          return (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 8px',
                borderRight: '1px solid #292929',
                height: 32,
                flexShrink: 0,
                background: '#1a1a1a',
              }}
            >
              <span style={{ color: '#ff4757', fontSize: 9, whiteSpace: 'nowrap' }}>Delete?</span>
              <button
                onClick={() => onDeleteConfirm(w.id)}
                style={{
                  background: '#ff4757',
                  border: 'none',
                  color: '#fff',
                  fontSize: 9,
                  padding: '2px 5px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Yes
              </button>
              <button
                onClick={onDeleteCancel}
                style={{
                  background: '#333',
                  border: 'none',
                  color: '#ccc',
                  fontSize: 9,
                  padding: '2px 5px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                No
              </button>
            </div>
          );
        }

        if (isRenaming) {
          return (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 6px',
                borderRight: '1px solid #292929',
                height: 32,
                flexShrink: 0,
                background: '#1a1a1a',
              }}
            >
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRenameSubmit(w.id);
                  if (e.key === 'Escape') onRenameCancel();
                }}
                style={{
                  background: '#252525',
                  border: '1px solid #444',
                  borderRadius: 2,
                  color: '#e0e0e0',
                  fontSize: 10,
                  padding: '2px 4px',
                  outline: 'none',
                  width: 80,
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => onRenameSubmit(w.id)}
                style={{
                  background: '#00c853',
                  border: 'none',
                  color: '#000',
                  fontSize: 9,
                  padding: '2px 5px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                }}
              >
                OK
              </button>
              <button
                onClick={onRenameCancel}
                style={{
                  background: '#333',
                  border: 'none',
                  color: '#ccc',
                  fontSize: 9,
                  padding: '2px 5px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                x
              </button>
            </div>
          );
        }

        return (
          <div
            key={w.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '0 8px',
              borderRight: '1px solid #292929',
              borderBottom: isActive ? '2px solid #ffa726' : '2px solid transparent',
              height: 32,
              flexShrink: 0,
              background: isActive ? '#141414' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
              position: 'relative',
            }}
            onClick={() => onSelect(w.id)}
          >
            <span style={{
              color: isActive ? '#ffa726' : '#888',
              fontSize: 10,
              whiteSpace: 'nowrap',
              maxWidth: 80,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: 0.3,
            }}>
              {w.name}
            </span>
            <TabActions
              watchlist={w}
              canDelete={watchlists.length > 1}
              onRenameStart={onRenameStart}
              onDeleteStart={onDeleteStart}
            />
          </div>
        );
      })}

      {creatingNew ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 6px',
          height: 32,
          flexShrink: 0,
          background: '#1a1a1a',
          borderRight: '1px solid #292929',
        }}>
          <input
            ref={newNameInputRef}
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNewSubmit();
              if (e.key === 'Escape') onNewCancel();
            }}
            placeholder="Name..."
            style={{
              background: '#252525',
              border: '1px solid #444',
              borderRadius: 2,
              color: '#e0e0e0',
              fontSize: 10,
              padding: '2px 4px',
              outline: 'none',
              width: 72,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onNewSubmit}
            style={{
              background: '#00c853',
              border: 'none',
              color: '#000',
              fontSize: 9,
              padding: '2px 5px',
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            OK
          </button>
          <button
            onClick={onNewCancel}
            style={{
              background: '#333',
              border: 'none',
              color: '#ccc',
              fontSize: 9,
              padding: '2px 5px',
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            x
          </button>
        </div>
      ) : (
        <button
          onClick={onAddNew}
          title="New watchlist"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: 14,
            width: 28,
            height: 32,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00c853')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
        >
          +
        </button>
      )}
    </div>
  );
}

function TabActions({
  watchlist,
  canDelete,
  onRenameStart,
  onDeleteStart,
}: {
  watchlist: Watchlist;
  canDelete: boolean;
  onRenameStart: (w: Watchlist) => void;
  onDeleteStart: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s',
        marginLeft: 2,
      }}
    >
      <button
        title="Rename"
        onClick={(e) => { e.stopPropagation(); onRenameStart(watchlist); }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          fontSize: 9,
          cursor: 'pointer',
          padding: '1px 2px',
          fontFamily: 'inherit',
          lineHeight: 1,
          borderRadius: 2,
          transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffa726')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
      >
        ✎
      </button>
      {canDelete && (
        <button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDeleteStart(watchlist.id); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: 9,
            cursor: 'pointer',
            padding: '1px 2px',
            fontFamily: 'inherit',
            lineHeight: 1,
            borderRadius: 2,
            transition: 'color 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4757')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
