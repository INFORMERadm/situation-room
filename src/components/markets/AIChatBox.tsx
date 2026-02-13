import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatSession } from '../../hooks/useAIChat';
import AIMessageRenderer from './AIMessageRenderer';

interface Props {
  messages: ChatMessage[];
  isExpanded: boolean;
  isStreaming: boolean;
  streamingContent: string;
  sessions: ChatSession[];
  inlineStatus: string | null;
  onSend: (text: string) => void;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
}

export default function AIChatBox({
  messages, isExpanded, isStreaming, streamingContent,
  sessions, inlineStatus,
  onSend, onToggleExpand, onCollapse, onLoadSession, onNewSession,
}: Props) {
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSend(text);
  }, [input, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const cleanStreaming = streamingContent
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*$/g, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_call>[\s\S]*$/g, '')
    .trim();

  if (!isExpanded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderTop: '1px solid #292929',
        background: '#0a0a0a',
        minHeight: 40,
        position: 'relative',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isStreaming ? '#00c853' : '#fb8c00',
          flexShrink: 0,
          animation: isStreaming ? 'aiPulse 1s ease-in-out infinite' : 'none',
        }} />
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask N3... (e.g. 'Show me TSLA balance sheet')"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        {inlineStatus && (
          <span style={{
            color: '#00c853',
            fontSize: 10,
            whiteSpace: 'nowrap',
            animation: 'aiFadeIn 0.3s ease-out',
          }}>
            {inlineStatus}
          </span>
        )}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            background: 'transparent',
            border: '1px solid #292929',
            borderRadius: 3,
            color: input.trim() ? '#fb8c00' : '#555',
            width: 28,
            height: 24,
            fontSize: 14,
            cursor: input.trim() ? 'pointer' : 'default',
            padding: 0,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
        <button
          onClick={onToggleExpand}
          style={{
            background: 'transparent',
            border: '1px solid #292929',
            borderRadius: 3,
            color: '#888',
            width: 28,
            height: 24,
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#888'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background: '#121212',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #292929',
        background: '#0a0a0a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isStreaming ? '#00c853' : '#fb8c00',
            animation: isStreaming ? 'aiPulse 1s ease-in-out infinite' : 'none',
          }} />
          <span style={{ color: '#e0e0e0', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
            N3 AI
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onNewSession}
            style={{
              background: 'transparent',
              border: '1px solid #292929',
              borderRadius: 3,
              color: '#888',
              padding: '3px 8px',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#888'; }}
          >
            New Chat
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSessions(!showSessions)}
              style={{
                background: showSessions ? '#1a1a1a' : 'transparent',
                border: '1px solid #292929',
                borderRadius: 3,
                color: '#888',
                padding: '3px 8px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              History
            </button>
            {showSessions && sessions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: '#1a1a1a',
                border: '1px solid #292929',
                borderRadius: 4,
                width: 260,
                maxHeight: 240,
                overflowY: 'auto',
                zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}>
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onLoadSession(s.id); setShowSessions(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #222',
                      color: '#ccc',
                      fontSize: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.title || 'Untitled'}
                    </div>
                    <div style={{ color: '#555', fontSize: 9, marginTop: 2 }}>
                      {new Date(s.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onCollapse}
            style={{
              background: 'transparent',
              border: '1px solid #292929',
              borderRadius: 3,
              color: '#888',
              width: 28,
              height: 24,
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff1744'; e.currentTarget.style.color = '#ff1744'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#888'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px 0',
        minHeight: 0,
      }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#555',
            gap: 12,
          }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span style={{ fontSize: 12 }}>Ask about any stock, market data, or financial information</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 400 }}>
              {[
                'Show me Apple balance sheet',
                'What is the price of NVDA?',
                'Show insider trades for TSLA',
                'Compare ratios for MSFT',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #292929',
                    borderRadius: 4,
                    color: '#888',
                    padding: '4px 10px',
                    fontSize: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#888'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              padding: '8px 16px',
              animation: 'aiFadeIn 0.3s ease-out',
            }}
          >
            <div style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: msg.role === 'user' ? '#fb8c00' : '#292929',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: msg.role === 'user' ? '#000' : '#00c853',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {msg.role === 'user' ? 'U' : 'N3'}
              </div>
              <div style={{
                maxWidth: '85%',
                background: msg.role === 'user' ? '#1a1a1a' : '#0d0d0d',
                borderRadius: 8,
                padding: '10px 14px',
                borderLeft: msg.role === 'assistant' ? '2px solid #00c853' : 'none',
                borderRight: msg.role === 'user' ? '2px solid #fb8c00' : 'none',
              }}>
                {msg.role === 'user' ? (
                  <div style={{ color: '#e0e0e0', fontSize: 12, lineHeight: 1.5 }}>{msg.content}</div>
                ) : (
                  <AIMessageRenderer content={msg.content} />
                )}
                <div style={{ color: '#444', fontSize: 9, marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isStreaming && cleanStreaming && (
          <div style={{ padding: '8px 16px', animation: 'aiFadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#292929',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: '#00c853',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                N3
              </div>
              <div style={{
                maxWidth: '85%',
                background: '#0d0d0d',
                borderRadius: 8,
                padding: '10px 14px',
                borderLeft: '2px solid #00c853',
              }}>
                <AIMessageRenderer content={cleanStreaming} />
                <span style={{ animation: 'aiBlink 1s step-end infinite', color: '#00c853' }}>|</span>
              </div>
            </div>
          </div>
        )}

        {isStreaming && !cleanStreaming && (
          <div style={{ padding: '8px 16px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#292929',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: '#00c853',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                N3
              </div>
              <div style={{
                background: '#0d0d0d',
                borderRadius: 8,
                padding: '10px 14px',
                borderLeft: '2px solid #00c853',
                color: '#555',
                fontSize: 11,
              }}>
                <span style={{ animation: 'aiPulse 1s ease-in-out infinite' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderTop: '1px solid #292929',
        background: '#0a0a0a',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isStreaming ? '#00c853' : '#fb8c00',
          flexShrink: 0,
          animation: isStreaming ? 'aiPulse 1s ease-in-out infinite' : 'none',
        }} />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask N3 about any financial data..."
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            resize: 'none',
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            background: input.trim() ? '#fb8c00' : 'transparent',
            border: input.trim() ? 'none' : '1px solid #292929',
            borderRadius: 4,
            color: input.trim() ? '#000' : '#555',
            padding: '6px 16px',
            fontSize: 11,
            cursor: input.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit',
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
