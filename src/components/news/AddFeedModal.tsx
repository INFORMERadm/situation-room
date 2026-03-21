import { useState } from 'react';
import type { FeedType, ColumnPosition } from '../../hooks/useNewsDeckFeeds';

interface Props {
  feedType: FeedType;
  columnPosition: ColumnPosition;
  onAdd: (feedType: FeedType, url: string, displayName: string, columnPosition: ColumnPosition) => Promise<void>;
  onClose: () => void;
}

const TITLES: Record<FeedType, string> = {
  telegram: 'Add Telegram Channel',
  rss: 'Add RSS Feed',
  youtube: 'Add YouTube Channel',
};

const PLACEHOLDERS: Record<FeedType, { url: string; name: string }> = {
  telegram: {
    url: 'https://t.me/s/channelname',
    name: 'Channel Name',
  },
  rss: {
    url: 'https://feeds.example.com/rss.xml',
    name: 'Tech News Daily',
  },
  youtube: {
    url: 'https://www.youtube.com/channel/UC...',
    name: 'Channel Name',
  },
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #333',
  borderRadius: 8,
  width: 380,
  maxWidth: '90vw',
  padding: 0,
  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
};

const headerBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #222',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#e0e0e0',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  marginBottom: 4,
  display: 'block',
};

export default function AddFeedModal({ feedType, columnPosition, onAdd, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const placeholders = PLACEHOLDERS[feedType];

  const handleSubmit = async () => {
    const trimmedUrl = url.trim();
    const trimmedName = displayName.trim();

    if (!trimmedUrl) {
      setError('URL is required');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    if (!trimmedName) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');
    await onAdd(feedType, trimmedUrl, trimmedName, columnPosition);
    setSaving(false);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerBarStyle}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>
            {TITLES[feedType]}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>URL</label>
            <input
              style={inputStyle}
              placeholder={placeholders.url}
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Display Name</label>
            <input
              style={inputStyle}
              placeholder={placeholders.name}
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 4,
                color: '#aaa',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: '7px 16px',
                background: saving ? '#1a1a1a' : '#fff',
                border: 'none',
                borderRadius: 4,
                color: saving ? '#666' : '#000',
                fontSize: 12,
                fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Adding...' : 'Add Feed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
