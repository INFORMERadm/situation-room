import WorldClocks from './WorldClocks';

interface Props {
  externalClocks?: { label: string; zone: string }[];
  onAddClock?: (label: string, zone: string) => void;
  onRemoveClock?: (zone: string) => void;
}

export default function Header({ externalClocks, onAddClock, onRemoveClock }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: 'none',
        padding: '6px 16px',
        minHeight: 34,
        background: '#fb8c00',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#1a1a1a',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <img
          src="/Black_Transparent.png"
          alt="N3 Logo"
          style={{ width: 28, height: 28, objectFit: 'contain' }}
        />
        <span style={{ position: 'relative', top: 1 }}>GLOBAL MONITOR</span>
      </div>
      <WorldClocks
        externalClocks={externalClocks}
        onAddClock={onAddClock}
        onRemoveClock={onRemoveClock}
      />
    </div>
  );
}
