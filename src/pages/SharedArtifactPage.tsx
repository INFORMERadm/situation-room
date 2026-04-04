import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function SharedArtifactPage() {
  const { token } = useParams<{ token: string }>();
  const [title, setTitle] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchArtifact = async (pw?: string) => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ action: 'get', token });
      if (pw) params.set('password', pw);
      const res = await fetch(`${API_BASE}/artifact-share?${params}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.password_required && !data.html_content) {
        setTitle(data.title || 'Protected Artifact');
        setPasswordRequired(true);
        if (pw) setPasswordError('Invalid password');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Not found');
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setHtmlContent(data.html_content);
      setPasswordRequired(false);
      setLoading(false);
    } catch {
      setError('Failed to load artifact');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifact();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setPasswordError('');
    await fetchArtifact(password);
    setSubmitting(false);
  };

  const wrappedHtml = htmlContent ? `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; }
  body { padding: 24px; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>` : '';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#666', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <div style={{ color: '#666', fontSize: 16 }}>Artifact not found</div>
        <div style={{ color: '#444', fontSize: 12 }}>
          This link may have expired or been deactivated.
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <form
          onSubmit={handlePasswordSubmit}
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 12,
            padding: 32,
            width: 380,
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h2 style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>
            Protected Artifact
          </h2>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
            "{title}"
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#0a0a0a',
              border: `1px solid ${passwordError ? '#ef4444' : '#2a2a2a'}`,
              borderRadius: 8,
              color: '#e0e0e0',
              fontSize: 14,
              marginBottom: passwordError ? 4 : 12,
              outline: 'none',
            }}
          />
          {passwordError && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, textAlign: 'left' }}>
              {passwordError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: submitting ? '#1a1a1a' : '#00bcd4',
              border: 'none',
              borderRadius: 8,
              color: submitting ? '#666' : '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Verifying...' : 'View Artifact'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0d0d0d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>
        <span style={{ color: '#444', fontSize: 11 }}>Powered by N4</span>
      </div>
      <iframe
        srcDoc={wrappedHtml}
        sandbox="allow-scripts allow-same-origin"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#0a0a0a',
        }}
        title={title}
      />
    </div>
  );
}
