import WorldClocks from './WorldClocks';

export default function Header() {
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span style={{ position: 'relative', top: 1 }}>GLOBAL MONITOR</span>
      </div>
      <WorldClocks />
    </div>
  );
}
