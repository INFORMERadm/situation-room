import { useState } from 'react';
import type { MarketMover } from '../../types';
import MarketOverview from './MarketOverview';

interface WatchlistEntryInput {
  symbol: string;
  name: string;
}

interface Props {
  gainers: MarketMover[];
  losers: MarketMover[];
  active: MarketMover[];
  onSelect: (symbol: string) => void;
  externalTab?: string;
  onTabChange?: (tab: string) => void;
  externalWatchlist?: WatchlistEntryInput[];
  onAddInstrument?: (symbol: string, name: string) => void;
  onRemoveInstrument?: (symbol: string) => void;
}

type Tab = 'gainers' | 'losers' | 'active' | 'overview';

export default function MarketMovers({
  gainers, losers, active, onSelect,
  externalTab, onTabChange,
  externalWatchlist, onAddInstrument, onRemoveInstrument,
}: Props) {
  const [localTab, setLocalTab] = useState<Tab>('overview');
  const tab = (externalTab as Tab) || localTab;
  const setTab = (t: Tab) => {
    if (onTabChange) onTabChange(t);
    else setLocalTab(t);
  };

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'overview', label: 'Overview', color: '#ffa726' },
    { key: 'gainers', label: 'Gainers', color: '#00c853' },
    { key: 'losers', label: 'Losers', color: '#ff1744' },
    { key: 'active', label: 'Active', color: '#29b6f6' },
  ];

  const items = tab === 'gainers' ? gainers : tab === 'losers' ? losers : active;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #292929',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              background: tab === t.key ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              color: tab === t.key ? t.color : '#888',
              padding: '8px 4px',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <MarketOverview
          onSelect={onSelect}
          externalWatchlist={externalWatchlist}
          onAddInstrument={onAddInstrument}
          onRemoveInstrument={onRemoveInstrument}
        />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {items.length === 0 && (
            <div style={{ padding: 16, color: '#888', fontSize: 11 }}>Loading...</div>
          )}
          {items.map((item, i) => {
            const isUp = item.changesPercentage >= 0;
            const color = isUp ? '#00c853' : '#ff1744';
            return (
              <button
                key={item.symbol}
                onClick={() => onSelect(item.symbol)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1e1e1e',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#777', fontSize: 10, textAlign: 'right' }}>{i + 1}</span>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ color: '#ccc', fontSize: 11, fontWeight: 600 }}>{item.symbol}</div>
                  <div style={{
                    color: '#888',
                    fontSize: 9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </div>
                </div>
                <span style={{ color: '#ccc', fontSize: 11, textAlign: 'right' }}>
                  ${item.price.toFixed(2)}
                </span>
                <span style={{
                  color,
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'right',
                  minWidth: 65,
                }}>
                  {isUp ? '+' : ''}{item.changesPercentage.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
