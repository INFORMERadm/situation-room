import { useState } from 'react';
import type { ArtifactData } from '../../hooks/useAIChat';
import { supabase } from '../../lib/supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface Props {
  artifact: ArtifactData;
  onClose: () => void;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export default function ArtifactShareDialog({ artifact, onClose }: Props) {
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/artifact-share?action=create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          html_content: artifact.html,
          title: artifact.title,
          password: passwordEnabled ? password : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create share link');
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${data.share_token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: 12,
        padding: 24,
        width: 420,
        maxWidth: '90vw',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600, margin: 0 }}>
            Share Artifact
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
          "{artifact.title}"
        </div>

        {!shareUrl ? (
          <>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#ccc',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 12,
            }}>
              <input
                type="checkbox"
                checked={passwordEnabled}
                onChange={(e) => setPasswordEnabled(e.target.checked)}
                style={{ accentColor: '#00bcd4' }}
              />
              Password protect this artifact
            </label>

            {passwordEnabled && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#e0e0e0',
                  fontSize: 13,
                  marginBottom: 12,
                  outline: 'none',
                }}
              />
            )}

            {error && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || (passwordEnabled && !password)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: loading ? '#1a1a1a' : '#00bcd4',
                border: 'none',
                borderRadius: 8,
                color: loading ? '#666' : '#000',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Creating...' : 'Create Share Link'}
            </button>
          </>
        ) : (
          <>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
            }}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#00bcd4',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  background: copied ? '#00bcd4' : '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: copied ? '#000' : '#ccc',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {passwordEnabled && (
              <div style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>
                This artifact is password protected. Recipients will need the password to view it.
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                color: '#ccc',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
