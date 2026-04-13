import { useState } from 'react';

const YOUTUBE_VIDEO_ID = 'KSwPNkzEgxg';

export default function LiveCamButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          background: open ? '#e53e3e' : 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          letterSpacing: 0.5,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.9)';
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.75)';
        }}
      >
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#e53e3e',
          animation: 'livePulse 1.5s ease-in-out infinite',
        }} />
        LIVE CAMS
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 52,
          right: 14,
          zIndex: 1001,
          width: 420,
          background: 'rgba(0,0,0,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#e53e3e',
                animation: 'livePulse 1.5s ease-in-out infinite',
              }} />
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                LIVE CAM
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 16,
                padding: '2px 6px',
                lineHeight: 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
            >
              x
            </button>
          </div>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1`}
              title="Live Cam"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
