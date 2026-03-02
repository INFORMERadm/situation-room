import { useState, useRef, useCallback } from 'react';

interface Props {
  onSend: (text: string) => void;
  onAttachFile: (file: File) => void;
  sending: boolean;
  sttListening: boolean;
  sttTranscript: string;
  sttSupported: boolean;
  onToggleSTT: () => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 6,
  padding: '8px 12px',
  borderTop: '1px solid #292929',
  background: '#0a0a0a',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#141414',
  border: '1px solid #292929',
  borderRadius: 8,
  color: '#e0e0e0',
  fontSize: 12,
  padding: '8px 10px',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  lineHeight: '18px',
  maxHeight: 120,
  minHeight: 36,
  overflow: 'auto',
};

const iconBtnStyle = (active?: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: active ? '#ff9800' : '#777',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 6,
  padding: 0,
  flexShrink: 0,
  transition: 'color 0.15s',
});

const sendBtnStyle: React.CSSProperties = {
  background: '#ff9800',
  border: 'none',
  cursor: 'pointer',
  color: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 6,
  padding: 0,
  flexShrink: 0,
};

export default function ChatInput({
  onSend,
  onAttachFile,
  sending,
  sttListening,
  sttTranscript,
  sttSupported,
  onToggleSTT,
}: Props) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const msg = (text + (sttTranscript ? ' ' + sttTranscript : '')).trim();
    if (!msg || sending) return;
    onSend(msg);
    setText('');
  }, [text, sttTranscript, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onAttachFile(file);
  }, [onAttachFile]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const displayText = text + (sttTranscript ? (text ? ' ' : '') + sttTranscript : '');

  return (
    <div style={containerStyle} onDrop={handleDrop} onDragOver={handleDragOver}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        style={iconBtnStyle()}
        onClick={() => fileInputRef.current?.click()}
        title="Attach file"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {sttSupported && (
        <button
          style={iconBtnStyle(sttListening)}
          onClick={onToggleSTT}
          title={sttListening ? 'Stop dictating' : 'Voice input'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}

      <textarea
        ref={textareaRef}
        style={inputStyle}
        value={displayText}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={sttListening ? 'Listening...' : 'Message...'}
        rows={1}
      />

      <button
        style={{ ...sendBtnStyle, opacity: sending ? 0.5 : 1 }}
        onClick={handleSend}
        disabled={sending}
        title="Send"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
