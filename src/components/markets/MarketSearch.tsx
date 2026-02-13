import { useState, useEffect, useRef } from 'react';
import { fetchSymbolSearch } from '../../lib/api';
import type { SearchResult } from '../../types';

interface Props {
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}

export default function MarketSearch({ onSelect, currentSymbol }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await fetchSymbolSearch(query);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
      }}>
        <span style={{ color: '#fff', fontSize: 13 }}>&#x1F50D;</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={`Search symbols... (current: ${currentSymbol})`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        />
        {loading && <span style={{ color: '#888', fontSize: 10 }}>...</span>}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          border: '1px solid #292929',
          borderTop: 'none',
          zIndex: 100,
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          {results.map(r => (
            <button
              key={r.symbol}
              onClick={() => {
                onSelect(r.symbol);
                setQuery('');
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #222',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#00c853', fontSize: 12, fontWeight: 600, minWidth: 60 }}>
                  {r.symbol}
                </span>
                <span style={{
                  color: '#999',
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                  textAlign: 'left',
                }}>
                  {r.name}
                </span>
              </div>
              <span style={{ color: '#888', fontSize: 10 }}>{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
