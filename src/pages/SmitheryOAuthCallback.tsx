import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function SmitheryOAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const connectionId = sessionStorage.getItem('smithery_pending_connection');
    if (!connectionId) {
      setStatus('error');
      setErrorMsg('No pending connection found. Please try connecting again.');
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setErrorMsg('You must be logged in to complete this connection.');
          return;
        }

        const res = await fetch(`${API_BASE}/smithery-connect?action=retry`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId }),
        });

        const data = await res.json();

        if (data.status === 'connected') {
          sessionStorage.removeItem('smithery_pending_connection');
          setStatus('success');
          setTimeout(() => navigate('/', { replace: true }), 1500);
        } else if (data.status === 'auth_required') {
          setStatus('error');
          setErrorMsg('Authorization is still pending. Please try again.');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Connection failed. Please try again.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    })();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#000',
      color: '#f0f6fc',
      fontFamily: 'inherit',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 400,
        padding: 32,
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid #2d333b',
              borderTop: '3px solid #fb8c00',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px',
            }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Completing connection...
            </div>
            <div style={{ fontSize: 12, color: '#484f58' }}>
              Verifying your authorization with the service.
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#34d39920',
              border: '2px solid #34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Connected successfully
            </div>
            <div style={{ fontSize: 12, color: '#484f58' }}>
              Redirecting to dashboard...
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#f8717120',
              border: '2px solid #f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Connection failed
            </div>
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 20 }}>
              {errorMsg}
            </div>
            <button
              onClick={() => navigate('/', { replace: true })}
              style={{
                padding: '8px 20px',
                background: '#fb8c00',
                border: 'none',
                borderRadius: 6,
                color: '#000',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
