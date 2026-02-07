export default function WorldMap() {
  return (
    <div
      style={{
        border: '1px solid #1a3a4a',
        background: '#0d1117',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#4a8a9a',
          zIndex: 2,
        }}
      >
        GLOBAL VIEW
      </div>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src="https://streamable.com/e/mgozkr?autoplay=1&muted=1&loop=1&nocontrols=1"
          frameBorder="0"
          allow="autoplay"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    </div>
  );
}
