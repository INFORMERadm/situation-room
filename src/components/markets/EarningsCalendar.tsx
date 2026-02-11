import type { EarningsEvent } from '../../types';

interface Props {
  earnings: EarningsEvent[];
  onSelect: (symbol: string) => void;
}

function fmtNum(n: number | null): string {
  if (n === null || n === undefined) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toFixed(2);
}

export default function EarningsCalendar({ earnings, onSelect }: Props) {
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
        Earnings Calendar
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 80px 70px 70px',
          gap: 0,
          padding: '6px 12px',
          borderBottom: '1px solid #292929',
        }}>
          {['Symbol', 'Date', 'EPS Est', 'Rev Est'].map(h => (
            <span key={h} style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {h}
            </span>
          ))}
        </div>
        {earnings.length === 0 && (
          <div style={{ padding: 16, color: '#555', fontSize: 11 }}>Loading...</div>
        )}
        {earnings.map((e, i) => (
          <button
            key={`${e.symbol}-${i}`}
            onClick={() => onSelect(e.symbol)}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 80px 70px 70px',
              gap: 0,
              width: '100%',
              padding: '5px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #1e1e1e',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
            onMouseEnter={ev => (ev.currentTarget.style.background = '#1a1a1a')}
            onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: '#ff9800', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
              {e.symbol}
            </span>
            <span style={{ color: '#888', fontSize: 10, textAlign: 'left' }}>
              {e.date.slice(5, 10)}
            </span>
            <span style={{ color: '#ccc', fontSize: 10, textAlign: 'left' }}>
              {e.epsEstimated !== null ? e.epsEstimated.toFixed(2) : '-'}
            </span>
            <span style={{ color: '#ccc', fontSize: 10, textAlign: 'left' }}>
              {fmtNum(e.revenueEstimated)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
