import type { SportScore } from '../types';
import Panel from './Panel';

interface Props {
  data: SportScore[];
}

export default function SportsPanel({ data }: Props) {
  return (
    <Panel title="Sports" titleColor="#ffd93d" borderColor="#ffd93d44">
      {data.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ color: '#ffd93d', fontWeight: 700, fontSize: 11 }}>{s.league}</div>
          <div style={{ color: '#c9d1d9', fontSize: 11 }}>
            {s.matchup} ({s.status})
          </div>
          <div style={{ color: '#f0f6fc', fontWeight: 700, fontSize: 12 }}>{s.score}</div>
        </div>
      ))}
    </Panel>
  );
}
