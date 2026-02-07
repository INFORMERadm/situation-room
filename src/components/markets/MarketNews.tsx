import type { MarketNewsItem } from '../../types';

interface Props {
  news: MarketNewsItem[];
  onSelectSymbol: (symbol: string) => void;
}

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

export default function MarketNews({ news, onSelectSymbol }: Props) {
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
        {news.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #1e1e1e',
              transition: 'background 0.1s',
              cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ color: '#555', fontSize: 9 }}>{item.site}</span>
              <span style={{ color: '#333', fontSize: 9 }}>|</span>
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
