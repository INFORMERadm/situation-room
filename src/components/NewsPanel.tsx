import type { NewsItem } from '../types';
import Panel from './Panel';

interface Props {
  data: NewsItem[];
}

export default function NewsPanel({ data }: Props) {
  return (
    <Panel title="Global News" titleColor="#ff4757" borderColor="#ff475744">
      {data.map((n, i) => (
        <div key={i} style={{ marginBottom: 8, fontSize: 11 }}>
          <div style={{ color: '#ff4757', fontWeight: 700 }}>
            📰 {n.source}
          </div>
          <div style={{ color: '#c9d1d9' }}>{n.headline}</div>
        </div>
      ))}
    </Panel>
  );
}
