import type { MarketItem } from '../../types';

interface Props {
  items: MarketItem[];
  onSelect: (symbol: string) => void;
}

function formatPrice(price: number, category: string): string {
  if (category === 'forex') return price.toFixed(4);
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

export default function TickerStrip({ items, onSelect }: Props) {
  const grouped: Record<string, MarketItem[]> = {};
  for (const item of items) {
    const cat = item.category ?? 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const categoryOrder = ['index', 'commodity', 'forex', 'crypto'];
  const categoryLabels: Record<string, string> = {
    index: 'INDICES',
    commodity: 'COMMODITIES',
    forex: 'FOREX',
    crypto: 'CRYPTO',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      borderBottom: '1px solid #292929',
      padding: '8px 0',
      overflowX: 'auto',
      minHeight: 42,
    }}>
      {categoryOrder.map(cat => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) return null;
        return (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{
              color: '#555',
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '0 10px',
              whiteSpace: 'nowrap',
            }}>
              {categoryLabels[cat] ?? cat}
            </span>
            {catItems.map(item => (
              <button
                key={item.symbol}
                onClick={() => onSelect(item.symbol)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRight: '1px solid #292929',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#999', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {item.name ?? item.symbol}
                </span>
                <span style={{ color: '#e0e0e0', fontSize: 11, fontWeight: 600 }}>
                  {formatPrice(item.price, cat)}
                </span>
                <span style={{
                  color: item.change >= 0 ? '#00c853' : '#ff1744',
                  fontSize: 10,
                  fontWeight: 500,
                }}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        );
      })}
      {items.length === 0 && (
        <span style={{ color: '#555', fontSize: 11, padding: '0 16px' }}>
          Loading market data...
        </span>
      )}
    </div>
  );
}
