import type { PizzaData } from '../types';
import Panel from './Panel';

interface Props {
  data: PizzaData;
}

const DOUGHCON_COLORS: Record<number, string> = {
  1: '#ff4757',
  2: '#ff6b81',
  3: '#ffd93d',
  4: '#00ff88',
  5: '#58a6ff',
};

const DOUGHCON_LABELS: Record<number, string> = {
  1: 'MAXIMUM READINESS',
  2: 'FAST PACE',
  3: 'INCREASED VIGILANCE',
  4: 'NORMAL READINESS',
  5: 'LOW READINESS',
};

const TIME_LABELS = ['12p', '3p', '6p', '9p', '12a'];

export default function PizzaIndex({ data }: Props) {
  const color = DOUGHCON_COLORS[data.doughcon] || '#ffd93d';
  const maxVal = Math.max(...data.hourlyData, 1);

  return (
    <Panel
      title={`Pentagon Pizza Index | DOUGHCON ${data.doughcon}`}
      titleColor={color}
      borderColor={`${color}44`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '2px 0', fontSize: 11, flexShrink: 0 }}>
          <span style={{ color, fontWeight: 700 }}>
            {DOUGHCON_LABELS[data.doughcon]}: {data.index}%
          </span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            paddingTop: 4,
            minHeight: 0,
          }}
        >
          {data.hourlyData.map((val, i) => {
            const pct = (val / maxVal) * 100;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ fontSize: 9, color: '#c9d1d9', marginBottom: 2 }}>{val}</span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 28,
                    height: `${pct}%`,
                    minHeight: 2,
                    background: color,
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.5s ease',
                  }}
                />
                <span style={{ fontSize: 9, color: '#484f58', marginTop: 2 }}>
                  {TIME_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
