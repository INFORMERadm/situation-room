import { useState, useCallback, useRef, useEffect } from 'react';
import { streamAIChat, saveAIMessage, loadAIHistory, loadAISessions, fetchWebSearchSources, renameAISession, deleteAISession, deleteAISessions, deleteAllAISessions } from '../lib/api';
import type { AIMessage } from '../lib/api';
import { parseAIResponse, executeToolCall, isClientToolCall, isChartNavToolCall, buildContextPayload } from '../lib/aiTools';
import type { PlatformActions } from '../lib/aiTools';
import { usePlatform } from '../context/PlatformContext';
import type { SearchSource, SearchImage, SearchProgress } from '../types/index';

export type SearchMode = 'off' | 'tavily' | 'advanced';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: unknown;
  timestamp: number;
  searchSources?: SearchSource[];
  searchImages?: SearchImage[];
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
  selectedModel: string;
  searchMode: SearchMode;
  searchSources: SearchSource[];
  searchImages: SearchImage[];
  searchProgress: SearchProgress | null;
  isSourcesPanelOpen: boolean;
  sendMessage: (text: string) => void;
  stopGenerating: () => void;
  regenerate: () => void;
  deleteMessage: (id: string) => void;
  regenerateFrom: (id: string) => void;
  toggleExpand: () => void;
  collapse: () => void;
  loadSession: (id: string) => void;
  newSession: () => void;
  setModel: (model: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  toggleSourcesPanel: () => void;
  refreshSessions: () => void;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessions: (ids: string[]) => Promise<void>;
  deleteAllSessions: () => Promise<void>;
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SESSION_KEY = 'global-monitor-ai-session';

function parseSearchTags(fullText: string): {
  sources: SearchSource[];
  images: SearchImage[];
  progress: SearchProgress | null;
} {
  let sources: SearchSource[] = [];
  let images: SearchImage[] = [];
  let progress: SearchProgress | null = null;

  const statusRegex = /<search_status>([\s\S]*?)<\/search_status>/g;
  let match;
  while ((match = statusRegex.exec(fullText)) !== null) {
    try {
      progress = JSON.parse(match[1]);
    } catch { /* skip */ }
  }

  const sourcesRegex = /<search_sources>([\s\S]*?)<\/search_sources>/g;
  while ((match = sourcesRegex.exec(fullText)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.sources) sources = parsed.sources;
      if (parsed.images) images = parsed.images;
    } catch { /* skip */ }
  }

  return { sources, images, progress };
}

export function useAIChat(
  selectSymbol: (s: string) => void,
  setChartTimeframe: (tf: string) => void,
  userId?: string,
): UseAIChatReturn {
  const platform = usePlatform();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('hypermind-6.5');
  const [searchMode, setSearchModeState] = useState<SearchMode>('off');
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);
  const [searchImages, setSearchImages] = useState<SearchImage[]>([]);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
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
  const fullTextRef = useRef('');

  const platformActionsRef = useRef<PlatformActions>({
    selectSymbol: () => {},
    setChartTimeframe: () => {},
    setChartType: () => {},
    toggleIndicator: () => {},
    addToWatchlist: () => {},
    removeFromWatchlist: () => {},
    setRightPanelView: () => {},
    setLeftTab: () => {},
    collapseChat: () => {},
  });
  platformActionsRef.current = {
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
    collapseChat: () => setIsExpanded(false),
  };

  const refreshSessions = useCallback(() => {
    loadAISessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

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

      fetchWebSearchSources(sessionId).then((result) => {
        if (result?.sources) {
          const payload = result.sources;
          setSearchSources(payload.sources ?? []);
          setSearchImages(payload.images ?? []);
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
    setSearchProgress(null);
    if (searchMode === 'advanced') {
      setSearchSources([]);
      setSearchImages([]);
    }
    fullTextRef.current = '';

    const title = messages.length === 0 ? text.trim().slice(0, 80) : undefined;
    saveAIMessage(sessionId, 'user', text.trim(), undefined, title, userId).catch(() => {});

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

    const webSearch = searchMode !== 'off';

    abortRef.current = streamAIChat(
      aiMessages,
      contextPayload,
      (token) => {
        fullTextRef.current += token;
        setStreamingContent(fullTextRef.current);

        const { sources, images, progress } = parseSearchTags(fullTextRef.current);
        if (sources.length > 0) {
          setSearchSources(sources);
          setSearchImages(images);
          if (!isSourcesPanelOpen && sources.length > 0) {
            setIsSourcesPanelOpen(true);
          }
        }
        if (progress) {
          setSearchProgress(progress);
        }
      },
      (finalText) => {
        setIsStreaming(false);
        setStreamingContent('');
        setSearchProgress(null);

        const { sources, images } = parseSearchTags(finalText);
        const parsed = parseAIResponse(finalText);
        const clientCalls = parsed.toolCalls.filter(isClientToolCall);
        const statuses: string[] = [];

        for (const tc of clientCalls) {
          const result = executeToolCall(tc, platformActionsRef.current);
          if (result) statuses.push(result);
        }

        const hasChartNavCall = clientCalls.some(isChartNavToolCall);

        const hasRichDataContent = !hasChartNavCall && (
          parsed.text.length > 80 ||
          parsed.text.includes('|') ||
          parsed.text.includes('```') ||
          parsed.text.includes('**')
        );

        if (hasChartNavCall) {
          setIsExpanded(false);
        } else if (hasRichDataContent) {
          setIsExpanded(true);
        }

        if (statuses.length > 0 && !hasRichDataContent) {
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
          searchSources: sources.length > 0 ? sources : undefined,
          searchImages: images.length > 0 ? images : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);

        saveAIMessage(
          sessionId,
          'assistant',
          parsed.text,
          parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
        ).then(() => refreshSessions()).catch(() => {});
      },
      (err) => {
        setIsStreaming(false);
        setStreamingContent('');
        setSearchProgress(null);
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `_Error: ${err}_`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      },
      selectedModel,
      webSearch,
      searchMode !== 'off' ? searchMode : undefined,
    );
  }, [messages, isStreaming, sessionId, platform, selectedModel, searchMode, refreshSessions, isSourcesPanelOpen]);

  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setSearchProgress(null);
    const partial = streamingContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<think>[\s\S]*$/g, '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
      .replace(/<tool_call>[\s\S]*$/g, '')
      .replace(/<search_status>[\s\S]*?<\/search_status>/g, '')
      .replace(/<search_sources>[\s\S]*?<\/search_sources>/g, '')
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
    setSearchProgress(null);
    fullTextRef.current = '';

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

    const webSearch = searchMode !== 'off';

    abortRef.current = streamAIChat(
      aiMessages,
      contextPayload,
      (token) => {
        fullTextRef.current += token;
        setStreamingContent(fullTextRef.current);
        const { sources, images, progress } = parseSearchTags(fullTextRef.current);
        if (sources.length > 0) {
          setSearchSources(sources);
          setSearchImages(images);
        }
        if (progress) setSearchProgress(progress);
      },
      (finalText) => {
        setIsStreaming(false);
        setStreamingContent('');
        setSearchProgress(null);
        const { sources, images } = parseSearchTags(finalText);
        const parsed = parseAIResponse(finalText);
        const clientCalls = parsed.toolCalls.filter(isClientToolCall);
        for (const tc of clientCalls) {
          executeToolCall(tc, platformActionsRef.current);
        }
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: parsed.text,
          toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
          timestamp: Date.now(),
          searchSources: sources.length > 0 ? sources : undefined,
          searchImages: images.length > 0 ? images : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);
        saveAIMessage(sessionId, 'assistant', parsed.text, parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined).then(() => refreshSessions()).catch(() => {});
      },
      (err) => {
        setIsStreaming(false);
        setStreamingContent('');
        setSearchProgress(null);
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `_Error: ${err}_`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      },
      selectedModel,
      webSearch,
      searchMode !== 'off' ? searchMode : undefined,
    );
  }, [messages, isStreaming, sessionId, platform, selectedModel, searchMode, refreshSessions]);

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
    setSearchSources([]);
    setSearchImages([]);
    setIsExpanded(true);
  }, []);

  const newSession = useCallback(() => {
    const id = generateId();
    setSessionId(id);
    localStorage.setItem(SESSION_KEY, id);
    setMessages([]);
    setStreamingContent('');
    setSearchSources([]);
    setSearchImages([]);
    setSearchProgress(null);
  }, []);

  const setModel = useCallback((m: string) => {
    setSelectedModel(m);
  }, []);

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeState(mode);
  }, []);

  const toggleSourcesPanel = useCallback(() => {
    setIsSourcesPanelOpen(prev => !prev);
  }, []);

  const handleRenameSession = useCallback(async (id: string, title: string) => {
    await renameAISession(id, title);
    refreshSessions();
  }, [refreshSessions]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteAISession(id);
    if (id === sessionId) {
      const newId = generateId();
      setSessionId(newId);
      localStorage.setItem(SESSION_KEY, newId);
      setMessages([]);
      setStreamingContent('');
      setSearchSources([]);
      setSearchImages([]);
      setSearchProgress(null);
    }
    refreshSessions();
  }, [sessionId, refreshSessions]);

  const handleDeleteSessions = useCallback(async (ids: string[]) => {
    await deleteAISessions(ids);
    if (ids.includes(sessionId)) {
      const newId = generateId();
      setSessionId(newId);
      localStorage.setItem(SESSION_KEY, newId);
      setMessages([]);
      setStreamingContent('');
      setSearchSources([]);
      setSearchImages([]);
      setSearchProgress(null);
    }
    refreshSessions();
  }, [sessionId, refreshSessions]);

  const handleDeleteAllSessions = useCallback(async () => {
    await deleteAllAISessions();
    const newId = generateId();
    setSessionId(newId);
    localStorage.setItem(SESSION_KEY, newId);
    setMessages([]);
    setStreamingContent('');
    setSearchSources([]);
    setSearchImages([]);
    setSearchProgress(null);
    refreshSessions();
  }, [refreshSessions]);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const regenerateFrom = useCallback((id: string) => {
    if (isStreaming) return;

    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx < 0) return prev;
      const slice = prev[idx].role === 'assistant' ? prev.slice(0, idx) : prev.slice(0, idx + 1);
      const lastUser = [...slice].reverse().find(m => m.role === 'user');
      if (!lastUser) return prev;

      setIsStreaming(true);
      setStreamingContent('');
      setSearchProgress(null);
      fullTextRef.current = '';

      const aiMessages: AIMessage[] = slice.map(m => ({ role: m.role, content: m.content }));
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

      abortRef.current = streamAIChat(
        aiMessages,
        contextPayload,
        (token) => {
          fullTextRef.current += token;
          setStreamingContent(fullTextRef.current);
          const { sources, images, progress } = parseSearchTags(fullTextRef.current);
          if (sources.length > 0) { setSearchSources(sources); setSearchImages(images); }
          if (progress) setSearchProgress(progress);
        },
        (finalText) => {
          setIsStreaming(false);
          setStreamingContent('');
          setSearchProgress(null);
          const { sources, images } = parseSearchTags(finalText);
          const parsed = parseAIResponse(finalText);
          const clientCalls = parsed.toolCalls.filter(isClientToolCall);
          for (const tc of clientCalls) executeToolCall(tc, platformActionsRef.current);
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: parsed.text,
            toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
            timestamp: Date.now(),
            searchSources: sources.length > 0 ? sources : undefined,
            searchImages: images.length > 0 ? images : undefined,
          };
          setMessages(p => [...p, assistantMsg]);
          saveAIMessage(sessionId, 'assistant', parsed.text, parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined)
            .then(() => refreshSessions()).catch(() => {});
        },
        (err) => {
          setIsStreaming(false);
          setStreamingContent('');
          setSearchProgress(null);
          setMessages(p => [...p, { id: generateId(), role: 'assistant', content: `_Error: ${err}_`, timestamp: Date.now() }]);
        },
        selectedModel,
        searchMode !== 'off',
        searchMode !== 'off' ? searchMode : undefined,
      );

      return slice;
    });
  }, [isStreaming, platform, selectedModel, searchMode, sessionId, refreshSessions]);

  return {
    messages,
    isExpanded,
    isStreaming,
    streamingContent,
    sessionId,
    sessions,
    inlineStatus,
    selectedModel,
    searchMode,
    searchSources,
    searchImages,
    searchProgress,
    isSourcesPanelOpen,
    sendMessage,
    stopGenerating,
    regenerate,
    deleteMessage,
    regenerateFrom,
    toggleExpand,
    collapse,
    loadSession,
    newSession,
    setModel,
    setSearchMode,
    toggleSourcesPanel,
    refreshSessions,
    renameSession: handleRenameSession,
    deleteSession: handleDeleteSession,
    deleteSessions: handleDeleteSessions,
    deleteAllSessions: handleDeleteAllSessions,
  };
}
