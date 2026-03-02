import { useEffect, useRef, useCallback, useState } from 'react';
import { useMessaging } from '../../hooks/useMessaging';
import { useFileTransfer } from '../../hooks/useFileTransfer';
import { useLinkPreview } from '../../hooks/useLinkPreview';
import { useAIChatParticipant } from '../../hooks/useAIChatParticipant';
import { useGroupVoiceChat } from '../../hooks/useGroupVoiceChat';
import { useChatTTS } from '../../hooks/useChatTTS';
import { useChatSTT } from '../../hooks/useChatSTT';
import { supabase } from '../../lib/supabase';
import type { Conversation } from '../../types/chat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import VoiceRoom from './VoiceRoom';

interface Props {
  conversation: Conversation;
  userId: string;
  onBack: () => void;
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

export default function ConversationThread({ conversation, userId, onBack }: Props) {
  const messaging = useMessaging(conversation.id, userId);
  const fileTransfer = useFileTransfer(conversation.id, userId);
  const linkPreview = useLinkPreview();
  const aiChat = useAIChatParticipant(conversation.id, userId);
  const voice = useGroupVoiceChat(conversation.id, userId);
  const tts = useChatTTS();
  const stt = useChatSTT();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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
        {messaging.loading && (
          <div style={{ textAlign: 'center', padding: 20, color: '#555', fontSize: 11 }}>
            Decrypting messages...
          </div>
        )}

        {!messaging.loading && messaging.messages.length === 0 && (
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
              speakingId={tts.speakingMessageId}
              onSpeak={tts.speak}
              onDownloadFile={msg.message_type === 'file' ? () => fileTransfer.downloadFile(msg.id, meta) : undefined}
              linkPreview={preview}
              thumbnail={thumb}
            />
          );
        })}
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
