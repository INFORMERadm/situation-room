import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { VoiceSession } from '../types/chat';

interface PeerState {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useGroupVoiceChat(conversationId: string | null, userId: string | undefined) {
  const [activeSession, setActiveSession] = useState<VoiceSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const sessionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadActiveSession = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('messaging_voice_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveSession(data as VoiceSession);
    } else {
      setActiveSession(null);
    }
  }, [conversationId]);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`voice-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messaging_voice_sessions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as VoiceSession;
            if (session.status === 'active') {
              setActiveSession(session);
            } else {
              setActiveSession(null);
              cleanup();
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const cleanup = useCallback(() => {
    peersRef.current.forEach(peer => {
      peer.connection.close();
      peer.stream?.getTracks().forEach(t => t.stop());
    });
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (sessionChannelRef.current) {
      supabase.removeChannel(sessionChannelRef.current);
      sessionChannelRef.current = null;
    }
    setParticipants([]);
  }, []);

  const startVoiceSession = useCallback(async (enableAI: boolean = false) => {
    if (!conversationId || !userId) return;

    const { data, error } = await supabase
      .from('messaging_voice_sessions')
      .insert({
        conversation_id: conversationId,
        started_by: userId,
        status: 'active',
        ai_participant_enabled: enableAI,
      })
      .select()
      .single();

    if (error || !data) return;
    setActiveSession(data as VoiceSession);

    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    const signalChannel = supabase.channel(`voice-signal-${data.id}`, {
      config: { broadcast: { self: false } },
    });

    signalChannel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.target !== userId) return;
        const peer = peersRef.current.get(payload.from);
        if (payload.type === 'offer' && localStreamRef.current) {
          const pc = createPeerConnection(payload.from, signalChannel);
          localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'answer', sdp: answer, from: userId, target: payload.from },
          });
        } else if (payload.type === 'answer' && peer) {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } else if (payload.type === 'ice-candidate' && peer) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe();

    sessionChannelRef.current = signalChannel;

    signalChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'join', from: userId },
    });

    setParticipants([userId]);
  }, [conversationId, userId]);

  const createPeerConnection = useCallback((remoteUserId: string, signalChannel: ReturnType<typeof supabase.channel>): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'ice-candidate', candidate: e.candidate, from: userId, target: remoteUserId },
        });
      }
    };

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play();
      const existing = peersRef.current.get(remoteUserId);
      if (existing) {
        existing.stream = e.streams[0];
      }
    };

    peersRef.current.set(remoteUserId, { userId: remoteUserId, connection: pc });
    setParticipants(prev => prev.includes(remoteUserId) ? prev : [...prev, remoteUserId]);

    return pc;
  }, [userId]);

  const joinVoiceSession = useCallback(async () => {
    if (!activeSession || !userId) return;

    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    const signalChannel = supabase.channel(`voice-signal-${activeSession.id}`, {
      config: { broadcast: { self: false } },
    });

    signalChannel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.target !== userId) return;
        if (payload.type === 'answer') {
          const peer = peersRef.current.get(payload.from);
          if (peer) {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } else if (payload.type === 'ice-candidate') {
          const peer = peersRef.current.get(payload.from);
          if (peer) {
            await peer.connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } else if (payload.type === 'join' && localStreamRef.current) {
          const pc = createPeerConnection(payload.from, signalChannel);
          localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signalChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'offer', sdp: offer, from: userId, target: payload.from },
          });
        }
      })
      .subscribe();

    sessionChannelRef.current = signalChannel;
    setParticipants(prev => prev.includes(userId) ? prev : [...prev, userId]);

    signalChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'join', from: userId },
    });
  }, [activeSession, userId, createPeerConnection]);

  const leaveVoiceSession = useCallback(async () => {
    cleanup();
    if (activeSession && userId === activeSession.started_by) {
      await supabase
        .from('messaging_voice_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      setActiveSession(null);
    }
  }, [activeSession, userId, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleAI = useCallback(async () => {
    if (!activeSession) return;
    await supabase
      .from('messaging_voice_sessions')
      .update({ ai_participant_enabled: !activeSession.ai_participant_enabled })
      .eq('id', activeSession.id);
  }, [activeSession]);

  return {
    activeSession,
    isMuted,
    participants,
    startVoiceSession,
    joinVoiceSession,
    leaveVoiceSession,
    toggleMute,
    toggleAI,
  };
}
