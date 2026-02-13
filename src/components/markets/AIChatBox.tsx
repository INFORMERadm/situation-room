import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, ChatSession, SearchMode } from '../../hooks/useAIChat';
import type { SearchSource, SearchImage, SearchProgress } from '../../types/index';
import AIMessageRenderer from './AIMessageRenderer';
import ToolCallIndicator, { extractToolCalls } from './ToolCallIndicator';
import SourcePills from './SourcePills';
import SourcesPanel from './SourcesPanel';
import SearchProgressIndicator from './SearchProgressIndicator';

const MODEL_OPTIONS = [
  { id: 'hypermind-6.5', label: 'Hypermind 6.5' },
  { id: 'glm-5', label: 'GLM-5' },
];

interface Props {
  messages: ChatMessage[];
  isExpanded: boolean;
  isStreaming: boolean;
  streamingContent: string;
  sessions: ChatSession[];
  inlineStatus: string | null;
  selectedModel: string;
  searchMode: SearchMode;
  searchSources: SearchSource[];
  searchImages: SearchImage[];
  searchProgress: SearchProgress | null;
  isSourcesPanelOpen: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
  onModelChange: (model: string) => void;
  onShowChart: () => void;
  onSetSearchMode: (mode: SearchMode) => void;
  onToggleSourcesPanel: () => void;
  onRefreshSessions: () => void;
}

function SearchMenuDropdown({
  searchMode,
  onSetSearchMode,
  onClose,
}: {
  searchMode: SearchMode;
  onSetSearchMode: (mode: SearchMode) => void;
  onClose: () => void;
}) {
  const items = [
    { mode: 'tavily' as SearchMode, label: 'Tavily Search', desc: 'Quick web search' },
    { mode: 'advanced' as SearchMode, label: 'Deep Search', desc: 'Serper + Firecrawl + Jina' },
  ];

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: 4,
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: 6,
      padding: '4px 0',
      minWidth: 200,
      zIndex: 100,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      {items.map((item) => {
        const isActive = searchMode === item.mode;
        return (
          <button
            key={item.mode}
            onClick={() => {
              onSetSearchMode(isActive ? 'off' : item.mode);
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: isActive ? '#00bcd4' : '#ccc',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.1s',
              gap: 8,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.mode === 'tavily' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  <circle cx="11" cy="11" r="3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  <path d="M8 11h6" /><path d="M11 8v6" />
                </svg>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 9, color: '#777', marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
            {isActive && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function AIChatBox({
  messages, isExpanded, isStreaming, streamingContent,
  sessions, inlineStatus, selectedModel, searchMode,
  searchSources, searchImages: _searchImages, searchProgress,
  isSourcesPanelOpen,
  onSend, onStop, onRegenerate, onToggleExpand, onCollapse, onLoadSession, onNewSession,
  onModelChange, onShowChart, onSetSearchMode, onToggleSourcesPanel, onRefreshSessions,
}: Props) {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const webSearchEnabled = searchMode !== 'off';

  useEffect(() => {
    if (!searchMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target as Node)) {
        setSearchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchMenuOpen]);

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
    .replace(/<search_status>[\s\S]*?<\/search_status>/g, '')
    .replace(/<search_status>[\s\S]*$/g, '')
    .replace(/<search_sources>[\s\S]*?<\/search_sources>/g, '')
    .replace(/<search_sources>[\s\S]*$/g, '')
    .trim();

  const activeToolCalls = useMemo(
    () => isStreaming ? extractToolCalls(streamingContent) : [],
    [streamingContent, isStreaming]
  );

  const lastMsgIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  const searchButtonLabel = searchMode === 'advanced' ? 'Deep Search' : 'Search';

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
        <div ref={searchMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setSearchMenuOpen(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: webSearchEnabled ? 'rgba(0,188,212,0.1)' : 'transparent',
              border: `1px solid ${webSearchEnabled ? '#00bcd4' : '#333'}`,
              borderRadius: 3,
              color: webSearchEnabled ? '#00bcd4' : '#555',
              padding: '3px 8px',
              fontSize: 9,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            {searchButtonLabel}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 1 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {searchMenuOpen && (
            <SearchMenuDropdown
              searchMode={searchMode}
              onSetSearchMode={onSetSearchMode}
              onClose={() => setSearchMenuOpen(false)}
            />
          )}
        </div>
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
            color: input.trim() ? '#fb8c00' : '#888',
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
            color: '#aaa',
            width: 28,
            height: 24,
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}
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
      height: '100%',
      minHeight: 0,
      background: '#121212',
      position: 'relative',
    }}>
      <div style={{
        width: sidebarOpen ? 240 : 0,
        overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        borderRight: sidebarOpen ? '1px solid #292929' : 'none',
        background: '#0a0a0a',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #292929',
          flexShrink: 0,
          minWidth: 240,
        }}>
          <button
            onClick={() => { onNewSession(); setSidebarOpen(false); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e0e0e0',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.background = '#222'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#1a1a1a'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minWidth: 240 }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '20px 16px', color: '#888', fontSize: 10, textAlign: 'center' }}>
              No conversations yet
            </div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => { onLoadSession(s.id); setSidebarOpen(false); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1a1a1a',
                  color: '#ccc',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                  gap: 4,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#151515')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                  {s.title || 'Untitled'}
                </div>
                <div style={{ color: '#888', fontSize: 9 }}>
                  {new Date(s.updated_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #292929',
          background: '#0a0a0a',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                setSidebarOpen(prev => {
                  if (!prev) onRefreshSessions();
                  return !prev;
                });
              }}
              style={{
                background: sidebarOpen ? '#1a1a1a' : 'transparent',
                border: '1px solid #292929',
                borderRadius: 3,
                color: sidebarOpen ? '#fb8c00' : '#aaa',
                width: 28,
                height: 24,
                fontSize: 11,
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}}
              onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isStreaming ? '#00c853' : '#fb8c00',
              animation: isStreaming ? 'aiPulse 1s ease-in-out infinite' : 'none',
            }} />
            <span style={{ color: '#e0e0e0', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
              N3 AI
            </span>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedModel}
                onChange={e => onModelChange(e.target.value)}
                style={{
                  appearance: 'none',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 4,
                  color: '#ccc',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '3px 22px 3px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s',
                  height: 24,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#fb8c00'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#333'; }}
              >
                {MODEL_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {searchSources.length > 0 && (
              <button
                onClick={onToggleSourcesPanel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: isSourcesPanelOpen ? 'rgba(0,188,212,0.1)' : 'transparent',
                  border: `1px solid ${isSourcesPanelOpen ? '#00bcd4' : '#292929'}`,
                  borderRadius: 3,
                  color: isSourcesPanelOpen ? '#00bcd4' : '#aaa',
                  height: 24,
                  padding: '0 10px',
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  letterSpacing: 0.3,
                }}
                onMouseEnter={e => { if (!isSourcesPanelOpen) { e.currentTarget.style.borderColor = '#00bcd4'; e.currentTarget.style.color = '#00bcd4'; }}}
                onMouseLeave={e => { if (!isSourcesPanelOpen) { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Sources
                <span style={{
                  background: '#00bcd4',
                  color: '#000',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '0 4px',
                  borderRadius: 6,
                  lineHeight: '13px',
                }}>
                  {searchSources.length}
                </span>
              </button>
            )}
            <button
              onClick={onShowChart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: '1px solid #292929',
                borderRadius: 3,
                color: '#aaa',
                height: 24,
                padding: '0 10px',
                fontSize: 10,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: 0.3,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Chart
            </button>
            <button
              onClick={onCollapse}
              style={{
                background: 'transparent',
                border: '1px solid #292929',
                borderRadius: 3,
                color: '#aaa',
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
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 0', minHeight: 0 }}>
              {messages.length === 0 && !isStreaming && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#888',
                  gap: 12,
                }}>
                  <div style={{ opacity: 0.3 }}>
                    <img src="/white_transparent.png" alt="N3" width={48} height={48} style={{ display: 'block' }} />
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
                          color: '#aaa',
                          padding: '4px 10px',
                          fontSize: 10,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#292929'; e.currentTarget.style.color = '#aaa'; }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} style={{ padding: '8px 16px', animation: 'aiFadeIn 0.3s ease-out' }}>
                  <div style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: msg.role === 'user' ? '#fb8c00' : '#292929',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: msg.role === 'user' ? '#000' : '#00c853',
                      fontWeight: 700, flexShrink: 0,
                    }}>
                      {msg.role === 'user' ? 'U' : 'N3'}
                    </div>
                    <div style={{
                      maxWidth: '85%', minWidth: 0, overflow: 'hidden',
                      background: msg.role === 'user' ? '#1a1a1a' : '#0d0d0d',
                      borderRadius: 8, padding: '10px 14px',
                      borderLeft: msg.role === 'assistant' ? '2px solid #00c853' : 'none',
                      borderRight: msg.role === 'user' ? '2px solid #fb8c00' : 'none',
                    }}>
                      {msg.role === 'user' ? (
                        <div style={{ color: '#e0e0e0', fontSize: 12, lineHeight: 1.5 }}>{msg.content}</div>
                      ) : (
                        <>
                          {msg.searchSources && msg.searchSources.length > 0 && (
                            <SourcePills
                              sources={msg.searchSources}
                              onOpenPanel={onToggleSourcesPanel}
                              onSourceClick={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                            />
                          )}
                          <AIMessageRenderer
                            content={msg.content}
                            searchSources={msg.searchSources}
                            onOpenSourcesPanel={onToggleSourcesPanel}
                          />
                        </>
                      )}
                      <div style={{ color: '#777', fontSize: 9, marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isStreaming && searchProgress && (
                <SearchProgressIndicator progress={searchProgress} />
              )}

              {isStreaming && searchSources.length > 0 && !cleanStreaming && (
                <div style={{ padding: '8px 16px' }}>
                  <SourcePills
                    sources={searchSources}
                    onOpenPanel={onToggleSourcesPanel}
                    onSourceClick={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                  />
                </div>
              )}

              {isStreaming && cleanStreaming && (
                <div style={{ padding: '8px 16px', animation: 'aiFadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#292929',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#00c853', fontWeight: 700, flexShrink: 0,
                    }}>
                      N3
                    </div>
                    <div style={{
                      maxWidth: '85%', minWidth: 0, overflow: 'hidden',
                      background: '#0d0d0d', borderRadius: 8, padding: '10px 14px',
                      borderLeft: '2px solid #00c853',
                    }}>
                      {isStreaming && searchSources.length > 0 && (
                        <SourcePills
                          sources={searchSources}
                          onOpenPanel={onToggleSourcesPanel}
                          onSourceClick={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                        />
                      )}
                      <AIMessageRenderer
                        content={cleanStreaming}
                        searchSources={searchSources}
                        onOpenSourcesPanel={onToggleSourcesPanel}
                      />
                      <span style={{ animation: 'aiBlink 1s step-end infinite', color: '#00c853' }}>|</span>
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && activeToolCalls.length > 0 && !searchProgress && (
                <ToolCallIndicator toolCalls={activeToolCalls} />
              )}

              {isStreaming && !cleanStreaming && activeToolCalls.length === 0 && !searchProgress && (
                <div style={{ padding: '8px 16px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#292929',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#00c853', fontWeight: 700, flexShrink: 0,
                    }}>
                      N3
                    </div>
                    <div style={{
                      background: '#0d0d0d', borderRadius: 8, padding: '10px 14px',
                      borderLeft: '2px solid #00c853', color: '#888', fontSize: 11,
                    }}>
                      <span style={{ animation: 'aiPulse 1s ease-in-out infinite' }}>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {(isStreaming || lastMsgIsAssistant) && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 8,
                padding: '6px 12px', borderTop: '1px solid #1a1a1a', flexShrink: 0,
              }}>
                {isStreaming && (
                  <button
                    onClick={onStop}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 14px', background: 'transparent',
                      border: '1px solid #ff1744', borderRadius: 4,
                      color: '#ff1744', fontSize: 10, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ff174415'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    Stop generating
                  </button>
                )}
                {!isStreaming && lastMsgIsAssistant && (
                  <button
                    onClick={onRegenerate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 14px', background: 'transparent',
                      border: '1px solid #333', borderRadius: 4,
                      color: '#999', fontSize: 10, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb8c00'; e.currentTarget.style.color = '#fb8c00'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Regenerate
                  </button>
                )}
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', border: '2px solid #fb8c00',
              borderRadius: 6, margin: '0 8px 8px 8px',
              background: '#0a0a0a', flexShrink: 0,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isStreaming ? '#00c853' : '#fb8c00',
                flexShrink: 0,
                animation: isStreaming ? 'aiPulse 1s ease-in-out infinite' : 'none',
              }} />
              <div ref={searchMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setSearchMenuOpen(p => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: webSearchEnabled ? 'rgba(0,188,212,0.1)' : 'transparent',
                    border: `1px solid ${webSearchEnabled ? '#00bcd4' : '#333'}`,
                    borderRadius: 4, color: webSearchEnabled ? '#00bcd4' : '#555',
                    padding: '4px 10px', fontSize: 10, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  {searchButtonLabel}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {searchMenuOpen && (
                  <SearchMenuDropdown
                    searchMode={searchMode}
                    onSetSearchMode={onSetSearchMode}
                    onClose={() => setSearchMenuOpen(false)}
                  />
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask N3 about any financial data..."
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e0e0e0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  resize: 'none', lineHeight: 1.4,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                style={{
                  background: input.trim() ? '#fb8c00' : 'transparent',
                  border: input.trim() ? 'none' : '1px solid #292929',
                  borderRadius: 4, color: input.trim() ? '#000' : '#888',
                  padding: '6px 16px', fontSize: 11,
                  cursor: input.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                Send
              </button>
            </div>
          </div>

          <SourcesPanel
            sources={searchSources}
            isOpen={isSourcesPanelOpen}
            onClose={onToggleSourcesPanel}
          />
        </div>
      </div>
    </div>
  );
}
