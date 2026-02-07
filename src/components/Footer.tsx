export default function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #1a3a4a',
        padding: '4px 12px',
        fontSize: 11,
      }}
    >
      <span style={{ color: '#00ff88', fontWeight: 500 }}>
        NOW PLAYING: -- NO CREDENTIALS - NO SIGNAL
      </span>
      <span style={{ color: '#484f58' }}>
        [Q] Quit | [SPACE] Play/Pause | [N] Next | [?] Help | v1.3.0
      </span>
    </div>
  );
}
