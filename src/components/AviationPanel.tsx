import type { Flight } from '../types';
import Panel from './Panel';

interface Props {
  data: Flight[];
}

export default function AviationPanel({ data }: Props) {
  return (
    <Panel title="Aviation" titleColor="#00e5ff" borderColor="#00e5ff44">
      {data.map((f, i) => (
        <div key={i} style={{ marginBottom: 6, fontSize: 11 }}>
          <div style={{ color: '#00e5ff', fontWeight: 700 }}>
            ✈ {f.callsign}
          </div>
          <div style={{ color: '#c9d1d9' }}>
            {f.origin} - {f.altitude}
          </div>
        </div>
      ))}
    </Panel>
  );
}
