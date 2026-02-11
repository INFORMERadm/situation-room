import WorldClocks from './WorldClocks';

export default function Header() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #292929',
        padding: '6px 16px',
        minHeight: 34,
      }}
    >
      <div
        style={{
          color: '#00ff88',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        GLOBAL MONITOR
      </div>
      <WorldClocks />
    </div>
  );
}
