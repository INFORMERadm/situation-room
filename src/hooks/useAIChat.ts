import { useState, useCallback, useRef, useEffect } from 'react';
import { streamAIChat, saveAIMessage, loadAIHistory, loadAISessions } from '../lib/api';
import type { AIMessage } from '../lib/api';
import { parseAIResponse, executeToolCall, isClientToolCall, buildContextPayload } from '../lib/aiTools';
import type { PlatformActions } from '../lib/aiTools';
import { usePlatform } from '../context/PlatformContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: unknown;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string | null;
  updated_at: string;
}

export interface UseAIChatReturn {
  messages: ChatMessage[];
  isExpanded: boolean;
  isStreaming: boolean;
  streamingContent: string;
  sessionId: string;
  sessions: ChatSession[];
  inlineStatus: string | null;
  sendMessage: (text: string) => void;
  stopGenerating: () => void;
  regenerate: () => void;
  toggleExpand: () => void;
  collapse: () => void;
  loadSession: (id: string) => void;
  newSession: () => void;
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SESSION_KEY = 'global-monitor-ai-session';

export function useAIChat(
  selectSymbol: (s: string) => void,
  setChartTimeframe: (tf: string) => void,
): UseAIChatReturn {
  const platform = usePlatform();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = generateId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  });
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [inlineStatus, setInlineStatus] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inlineTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const platformActions: PlatformActions = {
    selectSymbol: (s: string) => {
      selectSymbol(s);
      platform.setChartType(platform.chartType);
    },
    setChartTimeframe,
    setChartType: platform.setChartType,
    toggleIndicator: platform.toggleIndicator,
    addToWatchlist: platform.addToWatchlist,
    removeFromWatchlist: platform.removeFromWatchlist,
    setRightPanelView: platform.setRightPanelView,
    setLeftTab: platform.setLeftTab,
  };

  useEffect(() => {
    loadAISessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadAIHistory(sessionId).then((msgs: { role: string; content: string; tool_calls?: unknown; created_at: string }[]) => {
        if (msgs.length > 0) {
          setMessages(msgs.map((m: { role: string; content: string; tool_calls?: unknown; created_at: string }) => ({
            id: generateId(),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            toolCalls: m.tool_calls,
            timestamp: new Date(m.created_at).getTime(),
          })));
        }
      }).catch(() => {});
    }
  }, [sessionId]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsExpanded(true);
    setIsStreaming(true);
    setStreamingContent('');

    const title = messages.length === 0 ? text.trim().slice(0, 80) : undefined;
    saveAIMessage(sessionId, 'user', text.trim(), undefined, title).catch(() => {});

    const aiMessages: AIMessage[] = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text.trim() },
    ];

    const contextPayload = buildContextPayload({
      selectedSymbol: '',
      chartTimeframe: '',
      chartType: platform.chartType,
      indicators: platform.indicators.map(i => ({ id: i.id, enabled: i.enabled })),
      watchlist: platform.watchlist,
      clocks: platform.clocks,
      rightPanelView: platform.rightPanelView,
      leftTab: platform.leftTab,
    });

    let fullText = '';

    abortRef.current = streamAIChat(
      aiMessages,
      contextPayload,
      (token) => {
        fullText += token;
        setStreamingContent(fullText);
      },
      (finalText) => {
        setIsStreaming(false);
        setStreamingContent('');

        const parsed = parseAIResponse(finalText);
        const clientCalls = parsed.toolCalls.filter(isClientToolCall);
        const statuses: string[] = [];

        for (const tc of clientCalls) {
          const result = executeToolCall(tc, platformActions);
          if (result) statuses.push(result);
        }

        const hasDataContent = parsed.text.length > 80 ||
          parsed.text.includes('|') ||
          parsed.text.includes('```') ||
          parsed.text.includes('**');

        if (hasDataContent) {
          setIsExpanded(true);
        }

        if (statuses.length > 0 && !hasDataContent) {
          setInlineStatus(statuses.join(' | '));
          clearTimeout(inlineTimerRef.current);
          inlineTimerRef.current = setTimeout(() => setInlineStatus(null), 3000);
        }

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: parsed.text,
          toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);

        saveAIMessage(
          sessionId,
          'assistant',
          parsed.text,
          parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
        ).catch(() => {});
      },
      (err) => {
        setIsStreaming(false);
        setStreamingContent('');
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `_Error: ${err}_`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      },
    );
  }, [messages, isStreaming, sessionId, platform, platformActions]);

  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    const partial = streamingContent.replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<think>[\s\S]*$/g, '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
      .replace(/<tool_call>[\s\S]*$/g, '')
      .trim();
    setStreamingContent('');
    if (partial) {
      const partialMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: partial,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, partialMsg]);
    }
  }, [streamingContent]);

  const regenerate = useCallback(() => {
    if (isStreaming) return;
    const lastAssistantIdx = messages.length - 1;
    if (lastAssistantIdx < 0 || messages[lastAssistantIdx].role !== 'assistant') return;

    const withoutLast = messages.slice(0, lastAssistantIdx);
    const lastUserMsg = [...withoutLast].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    setMessages(withoutLast);
    setIsStreaming(true);
    setStreamingContent('');

    const aiMessages: AIMessage[] = withoutLast.map(m => ({ role: m.role, content: m.content }));
    const contextPayload = buildContextPayload({
      selectedSymbol: '',
      chartTimeframe: '',
      chartType: platform.chartType,
      indicators: platform.indicators.map(i => ({ id: i.id, enabled: i.enabled })),
      watchlist: platform.watchlist,
      clocks: platform.clocks,
      rightPanelView: platform.rightPanelView,
      leftTab: platform.leftTab,
    });

    let fullText = '';
    abortRef.current = streamAIChat(
      aiMessages,
      contextPayload,
      (token) => {
        fullText += token;
        setStreamingContent(fullText);
      },
      (finalText) => {
        setIsStreaming(false);
        setStreamingContent('');
        const parsed = parseAIResponse(finalText);
        const clientCalls = parsed.toolCalls.filter(isClientToolCall);
        for (const tc of clientCalls) {
          executeToolCall(tc, platformActions);
        }
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: parsed.text,
          toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        saveAIMessage(sessionId, 'assistant', parsed.text, parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined).catch(() => {});
      },
      (err) => {
        setIsStreaming(false);
        setStreamingContent('');
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `_Error: ${err}_`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      },
    );
  }, [messages, isStreaming, sessionId, platform, platformActions]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const loadSession = useCallback((id: string) => {
    setSessionId(id);
    localStorage.setItem(SESSION_KEY, id);
    setMessages([]);
    setIsExpanded(true);
  }, []);

  const newSession = useCallback(() => {
    const id = generateId();
    setSessionId(id);
    localStorage.setItem(SESSION_KEY, id);
    setMessages([]);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isExpanded,
    isStreaming,
    streamingContent,
    sessionId,
    sessions,
    inlineStatus,
    sendMessage,
    stopGenerating,
    regenerate,
    toggleExpand,
    collapse,
    loadSession,
    newSession,
  };
}
