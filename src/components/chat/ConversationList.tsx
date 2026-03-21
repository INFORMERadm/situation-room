import { useState } from 'react';
import type { Conversation } from '../../types/chat';

interface Props {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  currentUserId: string | undefined;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getConversationAvatar(conv: Conversation, userId: string | undefined) {
  if (conv.type === 'group') {
    return conv.name?.[0]?.toUpperCase() || 'G';
  }
  const other = conv.participants.find(p => p.user_id !== userId);
  if (other?.profile) {
    return (other.profile.first_name[0] || '') + (other.profile.last_name[0] || '');
  }
  return '?';
}

const rowStyle = (isSelected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  cursor: 'pointer',
  background: isSelected ? '#141414' : 'transparent',
  borderLeft: isSelected ? '2px solid #fff' : '2px solid transparent',
  transition: 'background 0.15s',
});

const avatarStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#1a1a1a',
  border: '1px solid #292929',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#fff',
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  background: '#fff',
  color: '#000',
  fontSize: 9,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px',
  flexShrink: 0,
};

export default function ConversationList({
  conversations,
  loading,
  selectedId,
  currentUserId,
  onSelect,
  onNewChat,
  onNewGroup,
}: Props) {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? conversations.filter(c =>
        (c.name || '').toLowerCase().includes(filter.toLowerCase())
      )
    : conversations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
      }}>
        <input
          style={{
            flex: 1,
            background: '#141414',
            border: '1px solid #292929',
            borderRadius: 6,
            color: '#e0e0e0',
            fontSize: 11,
            padding: '6px 8px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          placeholder="Search conversations..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={onNewChat}
          title="New 1-on-1 chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={onNewGroup}
          title="New group chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 11 }}>
            Loading...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 11 }}>
            {filter ? 'No matches' : 'No conversations yet'}
          </div>
        )}

        {filtered.map(conv => (
          <div
            key={conv.id}
            style={rowStyle(conv.id === selectedId)}
            onClick={() => onSelect(conv.id)}
            onMouseEnter={(e) => {
              if (conv.id !== selectedId) (e.currentTarget as HTMLDivElement).style.background = '#0d0d0d';
            }}
            onMouseLeave={(e) => {
              if (conv.id !== selectedId) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={avatarStyle}>
              {getConversationAvatar(conv, currentUserId)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#e0e0e0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {conv.name || 'Chat'}
                </span>
                <span style={{ fontSize: 9, color: '#555', flexShrink: 0 }}>
                  {formatRelativeTime(conv.updated_at)}
                </span>
              </div>
              <div style={{
                fontSize: 10,
                color: '#777',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
              }}>
                {conv.type === 'group'
                  ? `${conv.participants.length} members`
                  : 'Direct message'}
              </div>
            </div>
            {conv.unreadCount > 0 && (
              <div style={badgeStyle}>{conv.unreadCount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
