import type { Forecast } from '../types';
import Panel from './Panel';

interface Props {
  data: Forecast[];
}

export default function ForecastsPanel({ data }: Props) {
  return (
    <Panel title="Forecasts" titleColor="#ff6bc6" borderColor="#ff6bc644">
      {data.map((f, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ color: '#ff6bc6', fontWeight: 700, fontSize: 11 }}>{f.platform}</div>
          <div style={{ color: '#c9d1d9', fontSize: 11 }}>{f.question}</div>
          <div style={{ color: '#00ff88', fontWeight: 700, fontSize: 12 }}>{f.odds}%</div>
        </div>
      ))}
    </Panel>
  );
}
