import { useMemo } from 'react';
import type { DecryptedMessage, LinkPreview } from '../../types/chat';
import LinkPreviewCard from './LinkPreviewCard';

interface Props {
  message: DecryptedMessage;
  isOwn: boolean;
  speakingId: string | null;
  onSpeak: (text: string, id: string) => void;
  onDownloadFile?: () => void;
  linkPreview?: LinkPreview | null;
  thumbnail?: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderTextWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) || [];
  const result: (string | JSX.Element)[] = [];

  parts.forEach((part, i) => {
    if (part) result.push(part);
    if (urls[i]) {
      result.push(
        <a
          key={i}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#64b5f6', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {urls[i]}
        </a>
      );
    }
  });
  return result;
}

export default function MessageBubble({ message, isOwn, speakingId, onSpeak, onDownloadFile, linkPreview, thumbnail }: Props) {
  const isSystem = message.message_type === 'system';
  const isAI = message.message_type === 'ai';
  const isFile = message.message_type === 'file';

  const meta = message.metadata as {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    text?: string;
  };

  const senderName = useMemo(() => {
    if (isAI) return 'Hypermind 6.5';
    if (isSystem) return '';
    if (isOwn) return 'You';
    const p = message.senderProfile;
    if (!p) return 'Unknown';
    return p.display_name || `${p.first_name} ${p.last_name}`;
  }, [isAI, isSystem, isOwn, message.senderProfile]);

  if (isSystem) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4px 12px',
        fontSize: 10,
        color: '#666',
        fontStyle: 'italic',
      }}>
        {message.content || meta.text}
      </div>
    );
  }

  const bubbleStyle: React.CSSProperties = {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
    background: isAI ? '#1a1a2e' : isOwn ? '#323232' : '#1a1a1a',
    border: isAI ? '1px solid #333366' : '1px solid #292929',
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    color: isAI ? '#bb86fc' : '#ff9800',
    marginBottom: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isOwn ? 'flex-end' : 'flex-start',
      padding: '2px 12px',
    }}>
      <div style={bubbleStyle}>
        {!isOwn && <div style={nameStyle}>{senderName}</div>}

        {isFile && thumbnail && (
          <div style={{ marginBottom: 6 }}>
            <img
              src={thumbnail}
              alt={meta.fileName || 'file'}
              style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 4 }}
            />
          </div>
        )}

        {isFile ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: onDownloadFile ? 'pointer' : 'default',
            }}
            onClick={onDownloadFile}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64b5f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <div>
              <div style={{ fontSize: 11, color: '#e0e0e0' }}>{meta.fileName || 'File'}</div>
              {meta.fileSize && (
                <div style={{ fontSize: 9, color: '#888' }}>
                  {(meta.fileSize / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#e0e0e0', lineHeight: '18px', wordBreak: 'break-word' }}>
            {renderTextWithLinks(message.content)}
          </div>
        )}

        {linkPreview && <LinkPreviewCard preview={linkPreview} />}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => onSpeak(message.content, message.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: speakingId === message.id ? '#ff9800' : '#555',
              display: 'flex',
              alignItems: 'center',
            }}
            title={speakingId === message.id ? 'Stop speaking' : 'Read aloud'}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {speakingId === message.id && (
                <>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              )}
            </svg>
          </button>
          <span style={{ fontSize: 9, color: '#555' }}>{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
