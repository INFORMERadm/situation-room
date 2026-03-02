import { useConversations } from '../../hooks/useConversations';
import ConversationList from './ConversationList';
import ConversationThread from './ConversationThread';
import NewChat from './NewChat';
import CreateGroup from './CreateGroup';

interface Props {
  userId: string | undefined;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#090909',
  borderLeft: '1px solid #292929',
  overflow: 'hidden',
};

const titleBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid #292929',
  background: '#0a0a0a',
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#ff9800',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  flex: 1,
};

const lockIconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 9,
  color: '#4caf50',
};

export default function ChatSidebar({ userId }: Props) {
  const convs = useConversations(userId);

  const handleNewChat = () => convs.setView('new-chat');
  const handleNewGroup = () => convs.setView('new-group');
  const handleBackToList = () => convs.setView('list');

  const handleSelectUser = async (otherUserId: string) => {
    await convs.createDirectChat(otherUserId);
  };

  const handleCreateGroup = async (name: string, memberIds: string[], inviteAI: boolean) => {
    await convs.createGroupChat(name, memberIds, inviteAI);
  };

  return (
    <div style={containerStyle}>
      <div style={titleBarStyle}>
        <span style={titleStyle}>Secure Chat</span>
        <span style={lockIconStyle}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          E2E
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {convs.view === 'list' && (
          <ConversationList
            conversations={convs.conversations}
            loading={convs.loading}
            selectedId={convs.selectedId}
            currentUserId={userId}
            onSelect={convs.selectConversation}
            onNewChat={handleNewChat}
            onNewGroup={handleNewGroup}
          />
        )}

        {convs.view === 'thread' && convs.selected && userId && (
          <ConversationThread
            conversation={convs.selected}
            userId={userId}
            onBack={handleBackToList}
          />
        )}

        {convs.view === 'new-chat' && (
          <NewChat
            onSelectUser={handleSelectUser}
            onBack={handleBackToList}
            searchUsers={convs.searchUsers}
          />
        )}

        {convs.view === 'new-group' && (
          <CreateGroup
            onCreateGroup={handleCreateGroup}
            onBack={handleBackToList}
            searchUsers={convs.searchUsers}
          />
        )}
      </div>
    </div>
  );
}
