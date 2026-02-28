import { useState, useEffect, useRef } from 'react';
import type { MarketNewsItem } from '../../types';

interface Props {
  news: MarketNewsItem[];
  newItemUrls: Set<string>;
  alarmMuted: boolean;
  onToggleMute: () => void;
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

export default function MarketNews({ news, newItemUrls, alarmMuted, onToggleMute, onSelectSymbol, onExplain }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevNewsRef = useRef<MarketNewsItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const prevNews = prevNewsRef.current;
    const wasEmpty = prevNews.length === 0;

    const changed =
      news.length !== prevNews.length ||
      news.some((item, i) => item.url !== prevNews[i]?.url);

    if (!changed) return;

    prevNewsRef.current = news;

    if (news.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setVisibleCount(0);
      return;
    }

    if (wasEmpty) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setVisibleCount(0);
      let count = 0;
      timerRef.current = setInterval(() => {
        count += 1;
        setVisibleCount(count);
        if (count >= news.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, STREAM_INTERVAL);
    } else {
      const newCount = news.length - prevNews.length;
      if (newCount > 0) {
        setVisibleCount(prev => prev + newCount);
      } else {
        setVisibleCount(news.length);
      }
    }

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
        color: '#aaa',
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Market News</span>
        <button
          onClick={onToggleMute}
          title={alarmMuted ? 'Unmute news alerts' : 'Mute news alerts'}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: alarmMuted ? '#555' : '#ff9800',
            display: 'flex',
            alignItems: 'center',
            padding: '2px 4px',
            borderRadius: 4,
            transition: 'color 0.15s',
          }}
        >
          {alarmMuted ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
              <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
              <path d="M18 8a6 6 0 0 0-9.33-5" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {news.length === 0 && (
          <div style={{ padding: 16, color: '#888', fontSize: 11 }}>Loading news...</div>
        )}
        {visible.map((item, i) => {
          const isNew = newItemUrls.has(item.url);
          return (
            <div
              key={item.url || i}
              className={isNew ? 'news-item-new' : undefined}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #1e1e1e',
                borderLeft: isNew ? undefined : '2px solid transparent',
                transition: 'background 0.1s',
                cursor: 'default',
                animation: 'newsStreamIn 0.3s ease-out both',
              }}
              onMouseEnter={e => {
                if (!isNew) e.currentTarget.style.background = '#1a1a1a';
              }}
              onMouseLeave={e => {
                if (!isNew) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ color: '#888', fontSize: 9 }}>{timeAgo(item.publishedDate)}</span>
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
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.title);
                      }}
                      style={{
                        background: '#1e90ff15',
                        border: '1px solid #1e90ff33',
                        color: '#1e90ff',
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 2,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        opacity: 0,
                        transition: 'opacity 0.15s',
                      }}
                      className="ai-explain-btn"
                    >
                      Copy
                    </button>
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
                        opacity: 0,
                        transition: 'opacity 0.15s',
                      }}
                      className="ai-explain-btn"
                    >
                      AI
                    </button>
                  </div>
                )}
              </div>
              <span
                style={{
                  color: '#ccc',
                  fontSize: 11,
                  lineHeight: 1.4,
                  display: 'block',
                }}
              >
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
