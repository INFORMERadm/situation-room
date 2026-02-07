import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const [time, setTime] = useState(new Date().toISOString().slice(11, 19));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const isMarkets = location.pathname === '/markets';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #00ff88',
        padding: '6px 16px',
        color: '#00ff88',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
        position: 'relative',
      }}
    >
      GLOBAL MONITOR | {time} UTC

      <div ref={menuRef} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'none',
            border: '1px solid #00ff8844',
            cursor: 'pointer',
            padding: '4px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            borderRadius: 2,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#00ff88')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#00ff8844')}
        >
          <span style={{ display: 'block', width: 16, height: 2, background: '#00ff88' }} />
          <span style={{ display: 'block', width: 16, height: 2, background: '#00ff88' }} />
          <span style={{ display: 'block', width: 16, height: 2, background: '#00ff88' }} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: '#121212',
              border: '1px solid #292929',
              minWidth: 200,
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <button
              onClick={() => { navigate('/'); setMenuOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: !isMarkets ? '#00ff8812' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #292929',
                color: !isMarkets ? '#00ff88' : '#888',
                padding: '10px 14px',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: 1,
                textTransform: 'uppercase',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#00ff8818')}
              onMouseLeave={e => (e.currentTarget.style.background = !isMarkets ? '#00ff8812' : 'transparent')}
            >
              Global Monitor
            </button>
            <button
              onClick={() => { navigate('/markets'); setMenuOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: isMarkets ? '#00ff8812' : 'transparent',
                border: 'none',
                color: isMarkets ? '#00ff88' : '#888',
                padding: '10px 14px',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: 1,
                textTransform: 'uppercase',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#00ff8818')}
              onMouseLeave={e => (e.currentTarget.style.background = isMarkets ? '#00ff8812' : 'transparent')}
            >
              Financial Markets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
