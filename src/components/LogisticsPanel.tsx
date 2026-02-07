import type { LogisticsItem } from '../types';
import Panel from './Panel';

interface Props {
  data: LogisticsItem[];
}

export default function LogisticsPanel({ data }: Props) {
  return (
    <Panel title="Logistics" titleColor="#58a6ff" borderColor="#58a6ff44">
      {data.map((l, i) => (
        <div key={i} style={{ marginBottom: 8, fontSize: 11 }}>
          <div style={{ color: '#58a6ff', fontWeight: 700 }}>
            🚢 {l.name}
          </div>
          <div style={{ color: '#c9d1d9' }}>
            {l.location} <span style={{ color: '#484f58', marginLeft: 8 }}>({l.status})</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
