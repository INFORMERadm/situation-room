import { useState, useEffect } from 'react';
import type { ConversationStatus } from '../lib/realtimeConversation';
import { toggleMute, getIsMuted } from '../lib/realtimeConversation';

interface ConversationModeButtonProps {
  status: ConversationStatus;
  onToggle: () => void;
  disabled?: boolean;
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12 Q4 6, 6 12 Q8 18, 10 12 Q12 6, 14 12 Q16 18, 18 12 Q20 6, 22 12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8" />
    </svg>
  );
}

export function ConversationModeButton({ status, onToggle, disabled }: ConversationModeButtonProps) {
  const isActive      = status !== 'idle' && status !== 'error';
  const isConnecting  = status === 'connecting';
  const isListening   = status === 'listening';
  const isSpeaking    = status === 'speaking';
  const isToolCalling = status === 'tool_calling';
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isActive) setIsMuted(getIsMuted());
  }, [isActive]);

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutedState = toggleMute();
    setIsMuted(newMutedState);
  };

  const getIcon = () => {
    if (isConnecting)  return <SpinnerIcon className="w-4 h-4 animate-spin" />;
    if (isToolCalling) return <WrenchIcon className="w-4 h-4 animate-pulse" />;
    if (isSpeaking)    return <VolumeIcon className="w-4 h-4" />;
    if (isListening)   return <WaveIcon className="w-4 h-4" />;
    return <WaveIcon className="w-4 h-4" />;
  };

  const getButtonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'relative',
      padding: '6px',
      borderRadius: '6px',
      border: 'none',
      cursor: disabled || isConnecting ? 'default' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s',
      outline: 'none',
      flexShrink: 0,
    };

    if (isConnecting)  return { ...base, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    if (isToolCalling) return { ...base, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
    if (isSpeaking)    return { ...base, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
    if (isListening)   return { ...base, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    if (isActive)      return { ...base, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    if (status === 'error') return { ...base, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
    return { ...base, background: 'transparent', color: '#555555' };
  };

  const getTooltip = () => {
    switch (status) {
      case 'idle':         return 'Start voice conversation';
      case 'connecting':   return 'Connecting...';
      case 'active':       return 'Voice active — click to stop';
      case 'listening':    return 'Listening...';
      case 'speaking':     return 'AI speaking...';
      case 'tool_calling': return 'Executing tool...';
      case 'error':        return 'Connection error — click to retry';
      default:             return 'Voice conversation';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button
        onClick={onToggle}
        disabled={disabled || isConnecting}
        style={getButtonStyle()}
        title={getTooltip()}
      >
        {isActive && !isConnecting && (
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '6px',
            background: 'currentColor',
            opacity: 0.12,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        )}
        {isListening && (
          <>
            <span style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.25)',
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
            }} />
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '7px',
              height: '7px',
              background: '#34d399',
              borderRadius: '50%',
            }} />
          </>
        )}
        {isSpeaking && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '7px',
            height: '7px',
            background: '#60a5fa',
            borderRadius: '50%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center' }}>
          {getIcon()}
        </span>
      </button>

      {isActive && !isConnecting && (
        <button
          onClick={handleMuteToggle}
          style={{
            position: 'relative',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            outline: 'none',
            background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            color: isMuted ? '#f87171' : '#555555',
            flexShrink: 0,
          }}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
