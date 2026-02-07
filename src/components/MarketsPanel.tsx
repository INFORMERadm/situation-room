import type { MarketItem } from '../types';
import Panel from './Panel';

interface Props {
  data: MarketItem[];
}

export default function MarketsPanel({ data }: Props) {
  return (
    <Panel title="Markets" titleColor="#00ff88" borderColor="#00ff8844">
      {data.map((m, i) => {
        const isUp = m.change >= 0;
        const color = isUp ? '#00ff88' : '#ff4757';
        const arrow = isUp ? '\u25B2' : '\u25BC';
        return (
          <div
            key={i}
            style={{
              marginBottom: 6,
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              fontSize: 12,
            }}
          >
            <span style={{ color, fontWeight: 700 }}>{arrow}</span>
            <span style={{ color: '#f0f6fc', fontWeight: 700 }}>{m.symbol}</span>
            <span style={{ color: '#c9d1d9' }}>
              {m.symbol === 'EUR/USD'
                ? m.price.toFixed(4)
                : m.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </span>
            <span style={{ color, fontWeight: 600, fontSize: 11 }}>
              ({m.change >= 0 ? '+' : ''}{m.change.toFixed(1)}%)
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
