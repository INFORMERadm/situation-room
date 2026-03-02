import { useState, useCallback } from 'react';
import type { ChatUserProfile } from '../../types/chat';

interface Props {
  onSelectUser: (userId: string) => void;
  onBack: () => void;
  searchUsers: (query: string) => Promise<ChatUserProfile[]>;
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderBottom: '1px solid #292929',
};

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: '#141414',
  border: '1px solid #292929',
  borderRadius: 6,
  color: '#e0e0e0',
  fontSize: 12,
  padding: '6px 10px',
  outline: 'none',
  fontFamily: 'inherit',
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#292929',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#ff9800',
  flexShrink: 0,
};

export default function NewChat({ onSelectUser, onBack, searchUsers }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatUserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const users = await searchUsers(q);
    setResults(users);
    setSearching(false);
  }, [searchUsers]);

  const getInitials = (p: ChatUserProfile) => {
    return (p.first_name[0] || '') + (p.last_name[0] || '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <input
          style={searchInputStyle}
          placeholder="Search users by name or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {searching && (
          <div style={{ padding: 16, textAlign: 'center', color: '#666', fontSize: 11 }}>
            Searching...
          </div>
        )}

        {!searching && results.length === 0 && query.length >= 2 && (
          <div style={{ padding: 16, textAlign: 'center', color: '#666', fontSize: 11 }}>
            No users found
          </div>
        )}

        {!searching && query.length < 2 && (
          <div style={{ padding: 16, textAlign: 'center', color: '#555', fontSize: 11 }}>
            Type at least 2 characters to search
          </div>
        )}

        {results.map(user => (
          <div
            key={user.id}
            style={userRowStyle}
            onClick={() => onSelectUser(user.id)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#141414'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={avatarStyle}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                getInitials(user)
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 500 }}>
                {user.display_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div style={{ fontSize: 10, color: '#666' }}>{user.n4_email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
