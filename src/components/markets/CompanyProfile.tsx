import { useState } from 'react';
import type { CompanyProfile as ProfileType, QuoteDetail } from '../../types';

interface Props {
  profile: ProfileType | null;
  quote: QuoteDetail | null;
  loading: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

export default function CompanyProfile({ profile, quote, loading }: Props) {
  const [descExpanded, setDescExpanded] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: 16, color: '#555', fontSize: 11 }}>
        Loading profile...
      </div>
    );
  }

  if (!profile && !quote) {
    return (
      <div style={{ padding: 16, color: '#555', fontSize: 11 }}>
        Select a symbol to view details
      </div>
    );
  }

  const isUp = (quote?.change ?? profile?.changes ?? 0) >= 0;
  const changeColor = isUp ? '#00c853' : '#ff1744';
  const price = quote?.price ?? profile?.price ?? 0;
  const change = quote?.change ?? profile?.changes ?? 0;
  const pctChange = quote?.changesPercentage ?? 0;

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {profile?.image && (
              <img
                src={profile.image}
                alt=""
                style={{ width: 28, height: 28, borderRadius: 4, background: '#222' }}
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 700 }}>
              {profile?.companyName ?? quote?.name ?? quote?.symbol ?? ''}
            </span>
            <span style={{ color: '#555', fontSize: 12 }}>
              {profile?.symbol ?? quote?.symbol}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile?.exchange && (
              <span style={{ color: '#666', fontSize: 10, background: '#1a1a1a', padding: '2px 6px', borderRadius: 2 }}>
                {profile.exchange}
              </span>
            )}
            {profile?.sector && (
              <span style={{ color: '#666', fontSize: 10, background: '#1a1a1a', padding: '2px 6px', borderRadius: 2 }}>
                {profile.sector}
              </span>
            )}
            {profile?.industry && (
              <span style={{ color: '#666', fontSize: 10, background: '#1a1a1a', padding: '2px 6px', borderRadius: 2 }}>
                {profile.industry}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#e0e0e0', fontSize: 22, fontWeight: 700 }}>
            ${price.toFixed(2)}
          </div>
          <div style={{ color: changeColor, fontSize: 13, fontWeight: 600 }}>
            {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{pctChange.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 12,
      }}>
        {[
          { label: 'Open', value: quote?.open?.toFixed(2) ?? '-' },
          { label: 'High', value: quote?.dayHigh?.toFixed(2) ?? '-' },
          { label: 'Low', value: quote?.dayLow?.toFixed(2) ?? '-' },
          { label: 'Prev Close', value: quote?.previousClose?.toFixed(2) ?? '-' },
          { label: 'Volume', value: quote?.volume ? fmtVol(quote.volume) : '-' },
          { label: 'Avg Volume', value: profile?.volAvg ? fmtVol(profile.volAvg) : '-' },
          { label: 'Market Cap', value: (quote?.marketCap || profile?.mktCap) ? fmtNum(quote?.marketCap || profile?.mktCap || 0) : '-' },
          { label: 'Beta', value: profile?.beta ? profile.beta.toFixed(2) : '-' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1a1a1a',
            padding: '6px 8px',
            borderRadius: 2,
          }}>
            <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              {stat.label}
            </div>
            <div style={{ color: '#ccc', fontSize: 12, fontWeight: 500 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {profile?.description && (
        <div>
          <p style={{
            color: '#888',
            fontSize: 11,
            lineHeight: 1.5,
            margin: 0,
            overflow: 'hidden',
            maxHeight: descExpanded ? 'none' : 36,
          }}>
            {profile.description}
          </p>
          {profile.description.length > 150 && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00c853',
                fontSize: 10,
                cursor: 'pointer',
                padding: '4px 0',
                fontFamily: 'inherit',
              }}
            >
              {descExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
