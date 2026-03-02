import { useState, useCallback } from 'react';
import type { ChatUserProfile } from '../../types/chat';

interface Props {
  onCreateGroup: (name: string, memberIds: string[], inviteAI: boolean) => void;
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#141414',
  border: '1px solid #292929',
  borderRadius: 6,
  color: '#e0e0e0',
  fontSize: 12,
  padding: '6px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const sectionStyle: React.CSSProperties = {
  padding: '8px 12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 12,
  padding: '3px 8px 3px 10px',
  fontSize: 10,
  color: '#e0e0e0',
  margin: '2px 4px 2px 0',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  fontSize: 12,
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  cursor: 'pointer',
};

const createBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#ff9800',
  color: '#000',
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 12px',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const avatarSmStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#292929',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 700,
  color: '#ff9800',
  flexShrink: 0,
};

export default function CreateGroup({ onCreateGroup, onBack, searchUsers }: Props) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatUserProfile[]>([]);
  const [selected, setSelected] = useState<ChatUserProfile[]>([]);
  const [inviteAI, setInviteAI] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    const users = await searchUsers(q);
    setResults(users.filter(u => !selected.some(s => s.id === u.id)));
  }, [searchUsers, selected]);

  const addMember = (user: ChatUserProfile) => {
    setSelected(prev => [...prev, user]);
    setResults(prev => prev.filter(u => u.id !== user.id));
    setQuery('');
  };

  const removeMember = (id: string) => {
    setSelected(prev => prev.filter(u => u.id !== id));
  };

  const handleCreate = () => {
    if (!name.trim() || selected.length === 0) return;
    onCreateGroup(name.trim(), selected.map(u => u.id), inviteAI);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0' }}>New Group</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={sectionStyle}>
          <div style={labelStyle}>Group Name</div>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name..."
            autoFocus
          />
        </div>

        {selected.length > 0 && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Members ({selected.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {selected.map(u => (
                <span key={u.id} style={chipStyle}>
                  {u.display_name || u.first_name}
                  <button style={removeBtnStyle} onClick={() => removeMember(u.id)}>x</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={sectionStyle}>
          <div style={labelStyle}>Add Members</div>
          <input
            style={inputStyle}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
          />
        </div>

        {results.map(user => (
          <div
            key={user.id}
            style={userRowStyle}
            onClick={() => addMember(user)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#141414'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={avatarSmStyle}>
              {(user.first_name[0] || '') + (user.last_name[0] || '')}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#e0e0e0' }}>
                {user.display_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div style={{ fontSize: 9, color: '#666' }}>{user.n4_email}</div>
            </div>
          </div>
        ))}

        <div
          style={checkboxRowStyle}
          onClick={() => setInviteAI(!inviteAI)}
        >
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            border: `1px solid ${inviteAI ? '#ff9800' : '#555'}`,
            background: inviteAI ? '#ff9800' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {inviteAI && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#e0e0e0', fontWeight: 500 }}>Invite Hypermind 6.5</div>
            <div style={{ fontSize: 9, color: '#888' }}>AI assistant will join the chat</div>
          </div>
        </div>

        <div style={{ padding: '12px' }}>
          <button
            style={{ ...createBtnStyle, opacity: (!name.trim() || selected.length === 0) ? 0.4 : 1 }}
            onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
