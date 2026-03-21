import type { VoiceSession } from '../../types/chat';

interface Props {
  session: VoiceSession | null;
  isMuted: boolean;
  participants: string[];
  isInSession: boolean;
  onStart: (enableAI?: boolean) => void;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleAI: () => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: '#0d1a0d',
  borderBottom: '1px solid #1a3a1a',
};

const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: 'none',
  background: active ? color : '#222',
  color: active ? '#fff' : '#888',
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all 0.15s',
});

const dotStyle = (active: boolean): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: active ? '#4caf50' : '#555',
  animation: active ? 'pulse 1.5s infinite' : 'none',
});

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#8bc34a',
  fontWeight: 600,
  letterSpacing: 0.3,
  flex: 1,
};

export default function VoiceRoom({
  session,
  isMuted,
  participants,
  isInSession,
  onStart,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleAI,
}: Props) {
  if (!session && !isInSession) {
    return (
      <div style={containerStyle}>
        <button
          style={btnStyle(false, '#4caf50')}
          onClick={() => onStart(false)}
          title="Start voice call"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
        <span style={{ ...labelStyle, color: '#666' }}>Start a voice call</span>
      </div>
    );
  }

  if (session && !isInSession) {
    return (
      <div style={containerStyle}>
        <div style={dotStyle(true)} />
        <span style={labelStyle}>Voice call active ({participants.length})</span>
        <button style={btnStyle(true, '#4caf50')} onClick={onJoin} title="Join call">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={dotStyle(true)} />
      <span style={labelStyle}>
        In call ({participants.length})
      </span>
      <button
        style={btnStyle(isMuted, '#f44336')}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isMuted ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>
      <button
        style={btnStyle(session?.ai_participant_enabled || false, '#fff')}
        onClick={onToggleAI}
        title={session?.ai_participant_enabled ? 'Remove AI from call' : 'Add AI to call'}
      >
        AI
      </button>
      <button
        style={btnStyle(true, '#f44336')}
        onClick={onLeave}
        title="Leave call"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="17" y2="7" />
            <line x1="17" y1="1" x2="23" y2="7" />
          </svg>
        </button>
    </div>
  );
}
