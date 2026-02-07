import type { SectorPerf } from '../../types';

interface Props {
  sectors: SectorPerf[];
}

export default function SectorPerformance({ sectors }: Props) {
  const sorted = [...sectors].sort(
    (a, b) => parseFloat(b.changesPercentage) - parseFloat(a.changesPercentage)
  );

  const maxAbs = sorted.reduce((max, s) => {
    const val = Math.abs(parseFloat(s.changesPercentage));
    return val > max ? val : max;
  }, 1);

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
        Sector Performance
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '4px 0' }}>
        {sorted.length === 0 && (
          <div style={{ padding: 16, color: '#555', fontSize: 11 }}>Loading...</div>
        )}
        {sorted.map(s => {
          const val = parseFloat(s.changesPercentage);
          const isUp = val >= 0;
          const color = isUp ? '#00c853' : '#ff1744';
          const barWidth = (Math.abs(val) / maxAbs) * 100;

          return (
            <div
              key={s.sector}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 60px',
                alignItems: 'center',
                padding: '5px 12px',
                gap: 8,
              }}
            >
              <span style={{
                color: '#999',
                fontSize: 10,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {s.sector}
              </span>
              <div style={{
                height: 12,
                background: '#1a1a1a',
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: isUp ? 'flex-start' : 'flex-end',
              }}>
                <div style={{
                  width: `${Math.max(barWidth, 2)}%`,
                  height: '100%',
                  background: isUp
                    ? 'linear-gradient(90deg, #00c85366, #00c853)'
                    : 'linear-gradient(270deg, #ff174466, #ff1744)',
                  borderRadius: 1,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{
                color,
                fontSize: 11,
                fontWeight: 600,
                textAlign: 'right',
              }}>
                {isUp ? '+' : ''}{val.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
