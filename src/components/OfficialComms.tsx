import Panel from './Panel';

interface Props {
  messages: string[];
}

export default function OfficialComms({ messages }: Props) {
  return (
    <Panel title="Official Comms" titleColor="#c9d1d9" borderColor="#1a3a4a">
      {messages.map((m, i) => (
        <div key={i} style={{ marginBottom: 4, fontSize: 11, color: '#c9d1d9' }}>
          {m}
        </div>
      ))}
    </Panel>
  );
}
