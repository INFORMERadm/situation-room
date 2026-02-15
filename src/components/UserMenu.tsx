import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = profile?.display_name || user?.email || '';
  const n4Email = profile?.n4_email || '';

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px 3px 3px',
          background: isOpen ? 'rgba(0,0,0,0.25)' : 'transparent',
          border: '1px solid transparent',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: '#fb8c00',
          letterSpacing: 0.5,
          border: '1.5px solid rgba(251,140,0,0.3)',
        }}>
          {initials}
        </div>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.6 }}>
          <path d="M1 1L5 5L9 1" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          width: 260,
          background: '#111318',
          border: '1px solid #1e2330',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #1e2330',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>
              {displayName}
            </div>
            {n4Email && (
              <div style={{ fontSize: 11, color: '#fb8c00', marginTop: 3 }}>
                {n4Email}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#484f58', marginTop: 2 }}>
              {user?.email}
            </div>
          </div>

          <div style={{ padding: '6px' }}>
            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 12,
                color: '#ff4757',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,71,87,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
