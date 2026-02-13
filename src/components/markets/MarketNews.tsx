import { useState, useEffect, useRef } from 'react';
import type { MarketNewsItem } from '../../types';

interface Props {
  news: MarketNewsItem[];
  onSelectSymbol: (symbol: string) => void;
  onExplain?: (headline: string) => void;
}

const STREAM_INTERVAL = 80;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MarketNews({ news, onSelectSymbol, onExplain }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevNewsRef = useRef<MarketNewsItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const changed =
      news.length !== prevNewsRef.current.length ||
      news.some((item, i) => item.url !== prevNewsRef.current[i]?.url);

    if (!changed) return;

    prevNewsRef.current = news;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setVisibleCount(0);

    if (news.length === 0) return;

    let count = 0;
    timerRef.current = setInterval(() => {
      count += 1;
      setVisibleCount(count);
      if (count >= news.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, STREAM_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [news]);

  const visible = news.slice(0, visibleCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
        color: '#888',
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        Market News
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {news.length === 0 && (
          <div style={{ padding: 16, color: '#555', fontSize: 11 }}>Loading news...</div>
        )}
        {visible.map((item, i) => (
          <div
            key={item.url || i}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #1e1e1e',
              transition: 'background 0.1s',
              cursor: 'default',
              animation: 'newsStreamIn 0.3s ease-out both',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ color: '#555', fontSize: 9 }}>{timeAgo(item.publishedDate)}</span>
              {item.symbol && (
                <button
                  onClick={() => onSelectSymbol(item.symbol)}
                  style={{
                    background: '#00c85315',
                    border: '1px solid #00c85333',
                    color: '#00c853',
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {item.symbol}
                </button>
              )}
              {onExplain && (
                <button
                  onClick={() => onExplain(item.title)}
                  style={{
                    background: '#fb8c0015',
                    border: '1px solid #fb8c0033',
                    color: '#fb8c00',
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    marginLeft: 'auto',
                    opacity: 0,
                    transition: 'opacity 0.15s',
                  }}
                  className="ai-explain-btn"
                >
                  AI
                </button>
              )}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#ccc',
                fontSize: 11,
                lineHeight: 1.4,
                textDecoration: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
            >
              {item.title}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
