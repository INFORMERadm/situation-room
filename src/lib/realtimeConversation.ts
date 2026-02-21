export type ConversationStatus =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'listening'
  | 'speaking'
  | 'tool_calling'
  | 'error';

export interface TranscriptionEvent {
  text: string;
  isFinal: boolean;
}

export interface ConversationEventHandlers {
  onStatusChange?: (status: ConversationStatus) => void;
  onTranscription?: (event: TranscriptionEvent) => void;
  onResponseText?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onToolCall?: (toolName: string) => void;
}

interface MCPServerInput {
  url: string;
  apiKey?: string;
  config?: Record<string, unknown>;
  smitheryNamespace?: string;
  smitheryConnectionId?: string;
}

interface MCPServerConfig {
  url: string;
  apiKey?: string;
  config?: Record<string, unknown>;
}

type SessionConfig = Record<string, unknown>;

interface ConversationSession {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  audioElement: HTMLAudioElement | null;
  mediaStream: MediaStream | null;
  status: ConversationStatus;
  handlers: ConversationEventHandlers;
  toolServerMap: Record<string, MCPServerConfig>;
  mcpServers: MCPServerConfig[];
  sessionConfig: SessionConfig | null;
}

interface PendingToolCall {
  name: string;
  arguments: string;
  callId: string;
}

interface CompletedToolCall {
  callId: string;
  name: string;
  arguments: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let currentSession: ConversationSession | null = null;
let sessionAuthToken: string = SUPABASE_KEY;

function updateStatus(status: ConversationStatus) {
  if (!currentSession) return;
  currentSession.status = status;
  currentSession.handlers.onStatusChange?.(status);
}

function transformServersForEdge(servers: MCPServerInput[]): MCPServerConfig[] {
  return servers.map(s => ({
    url: s.url,
    apiKey: s.apiKey,
    config: s.config || (s.smitheryNamespace && s.smitheryConnectionId ? {
      namespace: s.smitheryNamespace,
      connectionId: s.smitheryConnectionId,
    } : undefined),
  }));
}

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  server: MCPServerConfig
): Promise<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-tool-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionAuthToken}`,
      },
      body: JSON.stringify({ toolName, arguments: args, server }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tool call failed: ${errorText}`);
    }

    const data = await response.json();
    return data.result || 'No result returned';
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function processCompletedToolCalls(
  completedToolCalls: CompletedToolCall[],
  pendingToolCalls: Map<string, PendingToolCall>
) {
  if (completedToolCalls.length === 0 || !currentSession?.dataChannel) return;
  if (currentSession.dataChannel.readyState !== 'open') return;

  for (const toolCall of completedToolCalls) {
    let toolArgs: Record<string, unknown> = {};
    try {
      toolArgs = JSON.parse(toolCall.arguments || '{}');
    } catch {
      toolArgs = {};
    }

    const server = currentSession.toolServerMap[toolCall.name];
    let result: string;

    if (server) {
      result = await executeToolCall(toolCall.name, toolArgs, server);
    } else {
      result = `Error: Tool "${toolCall.name}" is not available. Available tools: ${
        Object.keys(currentSession.toolServerMap).join(', ') || 'none'
      }`;
    }

    if (currentSession?.dataChannel?.readyState === 'open') {
      currentSession.dataChannel.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: toolCall.callId,
          output: result,
        },
      }));
    }
  }

  completedToolCalls.length = 0;
  pendingToolCalls.clear();

  if (currentSession?.dataChannel?.readyState === 'open') {
    currentSession.dataChannel.send(JSON.stringify({ type: 'response.create' }));
  }

  updateStatus('active');
}

export async function startConversationSession(
  handlers: ConversationEventHandlers,
  options?: {
    systemPrompt?: string;
    conversationContext?: string;
    mcpServers?: MCPServerInput[];
    userId?: string;
    searchMode?: string;
    userToken?: string;
  }
): Promise<void> {
  if (currentSession && currentSession.status !== 'idle' && currentSession.status !== 'error') {
    return;
  }

  const mcpServers = transformServersForEdge(options?.mcpServers || []);
  sessionAuthToken = options?.userToken || SUPABASE_KEY;

  handlers.onStatusChange?.('connecting');

  let mediaStream: MediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    handlers.onStatusChange?.('error');
    handlers.onError?.(new Error(`Microphone access denied: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  });

  const audioElement = new Audio();
  audioElement.autoplay = true;

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      audioElement.srcObject = event.streams[0];
    }
  };

  mediaStream.getAudioTracks().forEach(track => {
    peerConnection.addTrack(track, mediaStream);
  });

  peerConnection.addTransceiver('audio', { direction: 'sendrecv' });

  const dataChannel = peerConnection.createDataChannel('oai-events', { ordered: true });

  currentSession = {
    peerConnection,
    dataChannel,
    audioElement,
    mediaStream,
    status: 'connecting',
    handlers,
    toolServerMap: {},
    mcpServers,
    sessionConfig: null,
  };

  const pendingToolCalls = new Map<string, PendingToolCall>();
  const completedToolCalls: CompletedToolCall[] = [];
  let currentResponseText = '';
  let isResponseActive = false;
  let sessionUpdateSent = false;
  let sessionCreatedReceived = false;

  function trySendSessionUpdate() {
    if (sessionUpdateSent) return;
    if (!currentSession?.sessionConfig) return;
    if (!currentSession.dataChannel || currentSession.dataChannel.readyState !== 'open') return;
    if (!sessionCreatedReceived) return;

    sessionUpdateSent = true;
    currentSession.dataChannel.send(JSON.stringify({
      type: 'session.update',
      session: currentSession.sessionConfig,
    }));
  }

  dataChannel.onopen = () => {
    updateStatus('active');
    trySendSessionUpdate();
    setTimeout(() => {
      if (!sessionUpdateSent) trySendSessionUpdate();
    }, 2000);
  };

  dataChannel.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data as string);

      switch (message.type) {
        case 'session.created':
          sessionCreatedReceived = true;
          trySendSessionUpdate();
          break;

        case 'session.updated':
          break;

        case 'error':
          if (message.error?.code !== 'conversation_already_has_active_response') {
            handlers.onError?.(new Error(message.error?.message || 'Unknown realtime error'));
          }
          break;

        case 'input_audio_buffer.speech_started':
          updateStatus('listening');
          break;

        case 'input_audio_buffer.speech_stopped':
          break;

        case 'conversation.item.input_audio_transcription.completed':
          if (message.transcript) {
            handlers.onTranscription?.({ text: message.transcript, isFinal: true });
          }
          break;

        case 'response.created':
          isResponseActive = true;
          break;

        case 'response.audio_transcript.delta':
          if (message.delta) {
            currentResponseText += message.delta;
            handlers.onResponseText?.(currentResponseText, false);
          }
          break;

        case 'response.audio_transcript.done':
          if (message.transcript) {
            currentResponseText = message.transcript;
            handlers.onResponseText?.(currentResponseText, true);
          }
          currentResponseText = '';
          break;

        case 'response.audio.delta':
          if (currentSession?.status !== 'speaking') {
            updateStatus('speaking');
            handlers.onSpeakingStart?.();
          }
          break;

        case 'response.audio.done':
          handlers.onSpeakingEnd?.();
          break;

        case 'response.output_item.added':
          if (message.item?.type === 'function_call') {
            const callId = message.item.call_id as string;
            const name = message.item.name as string;
            pendingToolCalls.set(callId, { name, arguments: '', callId });
            updateStatus('tool_calling');
            handlers.onToolCall?.(name);
          }
          break;

        case 'response.function_call_arguments.delta':
          if (message.call_id && message.delta) {
            const pending = pendingToolCalls.get(message.call_id as string);
            if (pending) pending.arguments += message.delta;
          }
          break;

        case 'response.function_call_arguments.done':
          if (message.call_id) {
            const pending = pendingToolCalls.get(message.call_id as string);
            if (pending) pending.arguments = (message.arguments as string) || pending.arguments;
          }
          break;

        case 'response.output_item.done':
          if (message.item?.type === 'function_call' && message.item?.call_id) {
            const callId = message.item.call_id as string;
            const toolCall = pendingToolCalls.get(callId);
            if (toolCall) {
              completedToolCalls.push({ callId, name: toolCall.name, arguments: toolCall.arguments });
              pendingToolCalls.delete(callId);
            }
          }
          break;

        case 'response.done':
          isResponseActive = false;
          if (completedToolCalls.length > 0) {
            await processCompletedToolCalls(completedToolCalls, pendingToolCalls);
          } else {
            updateStatus('active');
          }
          break;
      }
    } catch (e) {
      console.error('Failed to parse realtime message:', e);
    }
  };

  dataChannel.onerror = (err) => {
    console.error('Data channel error:', err);
  };

  peerConnection.oniceconnectionstatechange = () => {
    if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'disconnected') {
      updateStatus('error');
      handlers.onError?.(new Error('WebRTC connection failed'));
    }
  };

  let offer: RTCSessionDescriptionInit;
  try {
    offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
  } catch (err) {
    stopConversationSession();
    handlers.onStatusChange?.('error');
    handlers.onError?.(new Error(`WebRTC offer failed: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  let data: {
    sdp: string;
    sessionConfig: SessionConfig;
    toolServerMap: Record<string, MCPServerConfig>;
    toolCount?: number;
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionAuthToken}`,
      },
      body: JSON.stringify({
        sdp: offer.sdp,
        systemPrompt: options?.systemPrompt,
        conversationContext: options?.conversationContext,
        mcpServers,
        userId: options?.userId,
        searchMode: options?.searchMode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session creation failed: ${errorText}`);
    }

    data = await response.json();
  } catch (err) {
    stopConversationSession();
    handlers.onStatusChange?.('error');
    handlers.onError?.(new Error(`Failed to connect to voice service: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  if (!currentSession) return;

  currentSession.toolServerMap = data.toolServerMap || {};
  currentSession.sessionConfig = data.sessionConfig || null;

  trySendSessionUpdate();

  try {
    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: data.sdp,
    });
  } catch (err) {
    stopConversationSession();
    handlers.onStatusChange?.('error');
    handlers.onError?.(new Error(`WebRTC answer failed: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  void isResponseActive;
}

export function stopConversationSession(): void {
  if (!currentSession) return;

  const session = currentSession;
  currentSession = null;
  sessionAuthToken = SUPABASE_KEY;

  if (session.mediaStream) {
    session.mediaStream.getTracks().forEach(track => track.stop());
  }

  if (session.dataChannel) {
    try { session.dataChannel.close(); } catch { /* ignore */ }
  }

  if (session.peerConnection) {
    try { session.peerConnection.close(); } catch { /* ignore */ }
  }

  if (session.audioElement) {
    session.audioElement.pause();
    session.audioElement.srcObject = null;
  }

  session.handlers.onStatusChange?.('idle');
}

export function isConversationActive(): boolean {
  return currentSession !== null && currentSession.status !== 'idle' && currentSession.status !== 'error';
}

export function getConversationStatus(): ConversationStatus {
  return currentSession?.status ?? 'idle';
}

export function muteConversation(): boolean {
  if (!currentSession?.mediaStream) return false;
  currentSession.mediaStream.getAudioTracks().forEach(track => {
    track.enabled = false;
  });
  return true;
}

export function unmuteConversation(): boolean {
  if (!currentSession?.mediaStream) return false;
  currentSession.mediaStream.getAudioTracks().forEach(track => {
    track.enabled = true;
  });
  return true;
}

export function toggleMute(): boolean {
  if (!currentSession?.mediaStream) return false;
  const firstTrack = currentSession.mediaStream.getAudioTracks()[0];
  const isCurrentlyEnabled = firstTrack?.enabled ?? true;
  currentSession.mediaStream.getAudioTracks().forEach(track => {
    track.enabled = !isCurrentlyEnabled;
  });
  return isCurrentlyEnabled;
}

export function getIsMuted(): boolean {
  if (!currentSession?.mediaStream) return false;
  const firstTrack = currentSession.mediaStream.getAudioTracks()[0];
  return firstTrack ? !firstTrack.enabled : false;
}

export function sendTextToConversation(text: string): void {
  if (!currentSession?.dataChannel || currentSession.dataChannel.readyState !== 'open') {
    console.warn('Cannot send text: conversation not active');
    return;
  }

  currentSession.dataChannel.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  }));
  currentSession.dataChannel.send(JSON.stringify({ type: 'response.create' }));
}

export function interruptResponse(): void {
  if (!currentSession?.dataChannel || currentSession.dataChannel.readyState !== 'open') return;
  currentSession.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
}
