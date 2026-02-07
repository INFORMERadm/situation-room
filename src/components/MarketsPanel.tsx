import { useState, useEffect, useRef, useCallback } from 'react';
import type { MarketItem, MarketCategory, SearchResult, QuoteDetail } from '../types';
import { fetchSymbolSearch, fetchQuote } from '../lib/api';
import Panel from './Panel';

interface Props {
  data: MarketItem[];
}

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  index: 'INDEXES',
  stock: 'STOCKS',
  forex: 'FOREX',
  crypto: 'CRYPTO',
};

const CATEGORY_ORDER: MarketCategory[] = ['index', 'stock', 'forex', 'crypto'];

function formatPrice(price: number, category: MarketCategory): string {
  if (category === 'forex') return price.toFixed(4);
  if (category === 'index') return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(1) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toString();
}

function SearchBar({ onSelectQuote }: { onSelectQuote: (q: QuoteDetail) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await fetchSymbolSearch(q);
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = async (symbol: string) => {
    setLoadingQuote(symbol);
    try {
      const quote = await fetchQuote(symbol);
      if (quote) onSelectQuote(quote);
    } catch { /* ignore */ }
    setLoadingQuote(null);
    setShowDropdown(false);
    setQuery('');
    setResults([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#161b22', border: '1px solid #00ff8833', borderRadius: 2, padding: '3px 6px' }}>
        <span style={{ color: '#484f58', fontSize: 11 }}>{isSearching ? '\u23F3' : '\u{1F50D}'}</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Search symbol..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f0f6fc',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            width: '100%',
          }}
        />
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 10,
          background: '#161b22',
          border: '1px solid #00ff8844',
          borderTop: 'none',
          maxHeight: 160,
          overflowY: 'auto',
        }}>
          {results.map((r) => (
            <div
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              style={{
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: 11,
                borderBottom: '1px solid #1a3a4a22',
                opacity: loadingQuote === r.symbol ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#1a3a4a'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <span>
                <span style={{ color: '#00ff88', fontWeight: 700, marginRight: 6 }}>{r.symbol}</span>
                <span style={{ color: '#8b949e' }}>{r.name.length > 20 ? r.name.slice(0, 18) + '..' : r.name}</span>
              </span>
              <span style={{ color: '#484f58', fontSize: 10 }}>{r.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuoteCard({ quote, onClose }: { quote: QuoteDetail; onClose: () => void }) {
  const isUp = quote.changesPercentage >= 0;
  const color = isUp ? '#00ff88' : '#ff4757';

  return (
    <div style={{
      background: '#161b22',
      border: `1px solid ${color}44`,
      borderRadius: 2,
      padding: '6px 8px',
      marginBottom: 6,
      fontSize: 11,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <span style={{ color: '#f0f6fc', fontWeight: 700, marginRight: 6 }}>{quote.symbol}</span>
          <span style={{ color: '#8b949e', fontSize: 10 }}>{quote.name}</span>
        </div>
        <span
          onClick={onClose}
          style={{ color: '#484f58', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
        >x</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ color: '#f0f6fc', fontWeight: 700, fontSize: 14 }}>
          {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{ color, fontWeight: 600 }}>
          {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changesPercentage.toFixed(2)}%)
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', color: '#8b949e', fontSize: 10 }}>
        <span>Open: <span style={{ color: '#c9d1d9' }}>{quote.open.toFixed(2)}</span></span>
        <span>Prev: <span style={{ color: '#c9d1d9' }}>{quote.previousClose.toFixed(2)}</span></span>
        <span>High: <span style={{ color: '#c9d1d9' }}>{quote.dayHigh.toFixed(2)}</span></span>
        <span>Low: <span style={{ color: '#c9d1d9' }}>{quote.dayLow.toFixed(2)}</span></span>
        <span>Vol: <span style={{ color: '#c9d1d9' }}>{formatVolume(quote.volume)}</span></span>
        {quote.marketCap > 0 && (
          <span>MCap: <span style={{ color: '#c9d1d9' }}>{formatVolume(quote.marketCap)}</span></span>
        )}
      </div>
    </div>
  );
}

export default function MarketsPanel({ data }: Props) {
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null);

  const grouped = CATEGORY_ORDER.reduce<Record<MarketCategory, MarketItem[]>>((acc, cat) => {
    acc[cat] = data.filter((m) => m.category === cat);
    return acc;
  }, { index: [], stock: [], forex: [], crypto: [] });

  return (
    <Panel title="Markets" titleColor="#00ff88" borderColor="#00ff8844">
      <SearchBar onSelectQuote={setSelectedQuote} />

      {selectedQuote && (
        <QuoteCard quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: '#484f58', marginBottom: 2 }}>
              {CATEGORY_LABELS[cat]}
            </div>
            {items.map((m, i) => {
              const isUp = m.change >= 0;
              const color = isUp ? '#00ff88' : '#ff4757';
              const arrow = isUp ? '\u25B2' : '\u25BC';
              const displaySymbol = m.name || m.symbol;
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: 3,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color, fontWeight: 700, fontSize: 9 }}>{arrow}</span>
                  <span style={{ color: '#f0f6fc', fontWeight: 700, minWidth: 60 }}>{displaySymbol}</span>
                  <span style={{ color: '#c9d1d9' }}>{formatPrice(m.price, cat)}</span>
                  <span style={{ color, fontWeight: 600, fontSize: 10 }}>
                    ({m.change >= 0 ? '+' : ''}{m.change.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </Panel>
  );
}
