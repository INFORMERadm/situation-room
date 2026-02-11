import WorldClocks from './WorldClocks';

export default function Header() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #c47400',
        padding: '6px 16px',
        minHeight: 34,
        background: '#e88a00',
      }}
    >
      <div
        style={{
          color: '#1a1a1a',
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
