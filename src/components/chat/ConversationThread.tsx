import { useEffect, useRef, useCallback, useState } from 'react';
import { useMessaging } from '../../hooks/useMessaging';
import { useFileTransfer } from '../../hooks/useFileTransfer';
import { useLinkPreview } from '../../hooks/useLinkPreview';
import { useAIChatParticipant } from '../../hooks/useAIChatParticipant';
import { useGroupVoiceChat } from '../../hooks/useGroupVoiceChat';
import { useChatTTS } from '../../hooks/useChatTTS';
import { useChatSTT } from '../../hooks/useChatSTT';
import { supabase } from '../../lib/supabase';
import { playChatNotification } from '../../lib/alarmSound';
import type { Conversation } from '../../types/chat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import VoiceRoom from './VoiceRoom';

interface Props {
  conversation: Conversation;
  userId: string;
  onBack: () => void;
  onDelete: (conversationId: string) => void;
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid #292929',
  background: '#0a0a0a',
  flexShrink: 0,
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

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  paddingTop: 8,
  paddingBottom: 8,
};

const lockBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '4px',
  background: '#0d1a0d',
  borderBottom: '1px solid #1a2a1a',
  fontSize: 9,
  color: '#4caf50',
  letterSpacing: 0.3,
};

const headerBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  color: '#888',
  transition: 'color 0.15s',
};

export default function ConversationThread({ conversation, userId, onBack, onDelete }: Props) {
  const messaging = useMessaging(conversation.id, userId);
  const fileTransfer = useFileTransfer(conversation.id, userId);
  const linkPreview = useLinkPreview();
  const aiChat = useAIChatParticipant(conversation.id, userId);
  const voice = useGroupVoiceChat(conversation.id, userId);
  const tts = useChatTTS();
  const stt = useChatSTT();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const initialMessageIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const fileMessages = messaging.messages.filter(
      m => m.message_type === 'file' && !thumbnails[m.id]
    );
    if (fileMessages.length === 0) return;

    const ids = fileMessages.map(m => m.id);
    supabase
      .from('messaging_file_transfers')
      .select('message_id, thumbnail_url')
      .in('message_id', ids)
      .then(({ data }) => {
        if (!data) return;
        setThumbnails(prev => {
          const next = { ...prev };
          let changed = false;
          data.forEach(row => {
            if (row.thumbnail_url && !next[row.message_id]) {
              next[row.message_id] = row.thumbnail_url;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      });
  }, [messaging.messages]);

  useEffect(() => {
    if (messaging.loading) return;
    if (initialMessageIdsRef.current === null) {
      initialMessageIdsRef.current = new Set(messaging.messages.map(m => m.id));
      return;
    }
    const incoming = messaging.messages.filter(
      m => !initialMessageIdsRef.current!.has(m.id) && m.sender_id !== userId
    );
    if (incoming.length === 0) return;

    incoming.forEach(m => initialMessageIdsRef.current!.add(m.id));

    playChatNotification();

    setNewMessageIds(prev => {
      const next = new Set(prev);
      incoming.forEach(m => next.add(m.id));
      return next;
    });

    const timer = setTimeout(() => {
      setNewMessageIds(prev => {
        const next = new Set(prev);
        incoming.forEach(m => next.delete(m.id));
        return next;
      });
    }, 6000);

    return () => clearTimeout(timer);
  }, [messaging.messages, messaging.loading, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaging.messages]);

  useEffect(() => {
    messaging.messages.forEach(m => {
      if (m.message_type === 'text' || m.message_type === 'link') {
        linkPreview.fetchPreviewsForText(m.content);
      }
    });
  }, [messaging.messages]);

  const handleSend = useCallback(async (text: string) => {
    await messaging.sendMessage(text);
    if (aiChat.hasHypermindMention(text)) {
      aiChat.invokeHypermind(text, messaging.messages);
    }
  }, [messaging, aiChat]);

  const handleAttachFile = useCallback(async (file: File) => {
    await fileTransfer.uploadFile(file);
  }, [fileTransfer]);

  const handleSTTToggle = useCallback(() => {
    stt.toggle((text) => {
      if (text.trim()) {
        handleSend(text.trim());
      }
    });
  }, [stt, handleSend]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = conversation.type === 'direct' || conversation.created_by === userId;

  const handleSaveChat = useCallback(() => {
    const lines = messaging.messages.map(msg => {
      const time = new Date(msg.created_at).toLocaleString();
      let sender = 'Unknown';
      if (msg.message_type === 'system') sender = 'System';
      else if (msg.message_type === 'ai') sender = 'Hypermind 6.5';
      else if (msg.sender_id === userId) sender = 'You';
      else if (msg.senderProfile) {
        sender = msg.senderProfile.display_name || `${msg.senderProfile.first_name} ${msg.senderProfile.last_name}`;
      }
      return `[${time}] ${sender}: ${msg.content}`;
    });

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversation.name || 'chat').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }, [messaging.messages, userId, conversation.name]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(conversation.id);
  }, [confirmDelete, onDelete, conversation.id]);

  const convName = conversation.name || 'Chat';
  const memberCount = conversation.participants.length;
  const isInVoice = voice.participants.includes(userId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {convName}
          </div>
          <div style={{ fontSize: 9, color: '#888' }}>
            {conversation.type === 'group' ? `${memberCount} members` : 'E2E encrypted'}
          </div>
        </div>

        <button
          style={headerBtnStyle}
          onClick={handleSaveChat}
          title="Save chat as text file"
          onMouseEnter={e => (e.currentTarget.style.color = '#4caf50')}
          onMouseLeave={e => (e.currentTarget.style.color = '#888')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {canDelete && (
          <button
            style={{ ...headerBtnStyle, color: confirmDelete ? '#f44336' : '#888' }}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete conversation'}
            onMouseEnter={e => (e.currentTarget.style.color = '#f44336')}
            onMouseLeave={e => { if (!confirmDelete) e.currentTarget.style.color = '#888'; }}
          >
            {confirmDelete ? (
              <span style={{ fontSize: 9, fontWeight: 600, color: '#f44336' }}>Confirm?</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div style={lockBannerStyle}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        AES-256 end-to-end encrypted
      </div>

      {conversation.type === 'group' && (
        <VoiceRoom
          session={voice.activeSession}
          isMuted={voice.isMuted}
          participants={voice.participants}
          isInSession={isInVoice}
          onStart={voice.startVoiceSession}
          onJoin={voice.joinVoiceSession}
          onLeave={voice.leaveVoiceSession}
          onToggleMute={voice.toggleMute}
          onToggleAI={voice.toggleAI}
        />
      )}

      <div style={messagesContainerStyle}>
        {messaging.loading && !messaging.error && (
          <div style={{ textAlign: 'center', padding: 20, color: '#555', fontSize: 11 }}>
            Decrypting messages...
          </div>
        )}

        {messaging.error && (
          <div style={{ textAlign: 'center', padding: 20, color: '#f44336', fontSize: 11 }}>
            <div>{messaging.error}</div>
            <button
              onClick={messaging.refresh}
              style={{
                marginTop: 8,
                padding: '4px 12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 4,
                color: '#fff',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!messaging.loading && !messaging.error && messaging.messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: '#555', fontSize: 11 }}>
            No messages yet. Say hello!
          </div>
        )}

        {messaging.messages.map(msg => {
          const urls = linkPreview.extractUrls(msg.content);
          const preview = urls.length > 0 ? linkPreview.getPreview(urls[0]) : null;
          const meta = msg.metadata as { fileIv?: string; fileName?: string; mimeType?: string; encryptedFileUrl?: string };
          const thumb = (msg.metadata as { thumbnail?: string }).thumbnail || thumbnails[msg.id] || undefined;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === userId}
              isNew={newMessageIds.has(msg.id)}
              speakingId={tts.speakingMessageId}
              onSpeak={tts.speak}
              onDownloadFile={msg.message_type === 'file' ? () => fileTransfer.downloadFile(msg.id, meta) : undefined}
              linkPreview={preview}
              thumbnail={thumb}
            />
          );
        })}

        {aiChat.isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            alignSelf: 'flex-start',
          }}>
            <div style={{
              padding: '6px 12px',
              borderRadius: '12px 12px 12px 2px',
              background: '#1a1a2e',
              border: '1px solid #333366',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#bb86fc', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Hypermind 6.5
              </span>
              <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#bb86fc',
                    animation: `chatPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>
                Searching & thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        onAttachFile={handleAttachFile}
        sending={messaging.sending}
        sttListening={stt.isListening}
        sttTranscript={stt.transcript}
        sttSupported={stt.isSupported}
        onToggleSTT={handleSTTToggle}
      />
    </div>
  );
}
