import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateIdentity, createConversationKey, distributeKeyToNewParticipant } from '../lib/keyManager';
import type { Conversation, Participant, ChatUserProfile, ChatView } from '../types/chat';

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ChatView>('list');
  const initializedRef = useRef(false);

  const ensureKeys = useCallback(async () => {
    if (!userId) return;
    await getOrCreateIdentity(userId);
  }, [userId]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: participantRows } = await supabase
      .from('messaging_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!participantRows || participantRows.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participantRows.map(p => p.conversation_id);

    const { data: convRows } = await supabase
      .from('messaging_conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (!convRows) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: allParticipants } = await supabase
      .from('messaging_participants')
      .select('*')
      .in('conversation_id', convIds);

    const participantUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, display_name, avatar_url, n4_email')
      .in('id', participantUserIds);

    const profileMap = new Map<string, ChatUserProfile>();
    (profiles || []).forEach(p => profileMap.set(p.id, p as ChatUserProfile));

    const { data: lastMessages } = await supabase
      .from('messaging_messages')
      .select('*')
      .in('conversation_id', convIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map<string, { created_at: string; message_type: string }>();
    (lastMessages || []).forEach(m => {
      if (!lastMsgMap.has(m.conversation_id)) {
        lastMsgMap.set(m.conversation_id, m);
      }
    });

    const convs: Conversation[] = convRows.map(c => {
      const parts: Participant[] = (allParticipants || [])
        .filter(p => p.conversation_id === c.id)
        .map(p => ({
          ...p,
          profile: profileMap.get(p.user_id),
        }));

      const myParticipant = parts.find(p => p.user_id === userId);
      const lastMsg = lastMsgMap.get(c.id);

      let unreadCount = 0;
      if (myParticipant && lastMsg) {
        if (!myParticipant.last_read_at || new Date(lastMsg.created_at) > new Date(myParticipant.last_read_at)) {
          unreadCount = 1;
        }
      }

      let name = c.name;
      if (c.type === 'direct') {
        const other = parts.find(p => p.user_id !== userId);
        if (other?.profile) {
          name = other.profile.display_name || `${other.profile.first_name} ${other.profile.last_name}`;
        }
      }

      return {
        id: c.id,
        type: c.type,
        name,
        avatar_url: c.avatar_url,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
        participants: parts,
        unreadCount,
      };
    });

    setConversations(convs);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;
    ensureKeys().catch(e => console.error('[chat] ensureKeys error:', e));
    loadConversations();
  }, [userId, ensureKeys, loadConversations]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messaging_participants', filter: `user_id=eq.${userId}` },
        () => { loadConversations(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadConversations]);

  const createDirectChat = useCallback(async (otherUserId: string) => {
    if (!userId) {
      console.error('[chat] createDirectChat: no userId');
      return null;
    }

    try {
      const existing = conversations.find(c =>
        c.type === 'direct' &&
        c.participants.length === 2 &&
        c.participants.some(p => p.user_id === otherUserId)
      );
      if (existing) {
        setSelectedId(existing.id);
        setView('thread');
        return existing.id;
      }

      const { data: conv, error } = await supabase
        .from('messaging_conversations')
        .insert({ type: 'direct', created_by: userId })
        .select()
        .single();

      if (error || !conv) {
        console.error('[chat] Failed to create direct conversation:', error);
        return null;
      }

      const { error: partErr } = await supabase.from('messaging_participants').insert([
        { conversation_id: conv.id, user_id: userId, role: 'admin' },
        { conversation_id: conv.id, user_id: otherUserId, role: 'member' },
      ]);
      if (partErr) console.error('[chat] Failed to insert participants:', partErr);

      createConversationKey(conv.id, [userId, otherUserId]).catch(e =>
        console.error('[chat] Key distribution error (non-fatal):', e)
      );

      await loadConversations();
      setSelectedId(conv.id);
      setView('thread');
      return conv.id;
    } catch (e) {
      console.error('[chat] createDirectChat error:', e);
      return null;
    }
  }, [userId, conversations, loadConversations]);

  const createGroupChat = useCallback(async (name: string, memberIds: string[], inviteAI: boolean) => {
    if (!userId) {
      console.error('[chat] createGroupChat: no userId');
      return null;
    }

    try {
      const { data: conv, error } = await supabase
        .from('messaging_conversations')
        .insert({ type: 'group', name, created_by: userId })
        .select()
        .single();

      if (error || !conv) {
        console.error('[chat] Failed to create group conversation:', error);
        return null;
      }

      const allMembers = [userId, ...memberIds];
      const participantRows = allMembers.map((uid) => ({
        conversation_id: conv.id,
        user_id: uid,
        role: uid === userId ? 'admin' : 'member',
      }));

      const { error: partErr } = await supabase.from('messaging_participants').insert(participantRows);
      if (partErr) console.error('[chat] Failed to insert participants:', partErr);

      createConversationKey(conv.id, allMembers).catch(e =>
        console.error('[chat] Key distribution error (non-fatal):', e)
      );

      if (inviteAI) {
        supabase.from('messaging_messages').insert({
          conversation_id: conv.id,
          sender_id: userId,
          encrypted_content: '',
          iv: '',
          message_type: 'system',
          metadata: { text: 'Hypermind 6.5 has been invited to this chat. Mention @hypermind to interact.' },
        }).then(({ error: msgErr }) => {
          if (msgErr) console.error('[chat] Failed to insert AI invite message:', msgErr);
        });
      }

      await loadConversations();
      setSelectedId(conv.id);
      setView('thread');
      return conv.id;
    } catch (e) {
      console.error('[chat] createGroupChat error:', e);
      return null;
    }
  }, [userId, loadConversations]);

  const addParticipant = useCallback(async (conversationId: string, newUserId: string) => {
    if (!userId) return;
    await supabase.from('messaging_participants').insert({
      conversation_id: conversationId,
      user_id: newUserId,
      role: 'member',
    });
    await distributeKeyToNewParticipant(conversationId, newUserId, userId);
    await loadConversations();
  }, [userId, loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    if (conv.type === 'group' && conv.created_by !== userId) return;

    await supabase
      .from('messaging_conversations')
      .delete()
      .eq('id', conversationId);

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (selectedId === conversationId) {
      setSelectedId(null);
      setView('list');
    }
  }, [userId, conversations, selectedId]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!userId) return;
    await supabase
      .from('messaging_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  }, [userId]);

  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);
    setView('thread');
    markRead(id);
  }, [markRead]);

  const searchUsers = useCallback(async (query: string): Promise<ChatUserProfile[]> => {
    if (!query.trim() || !userId) return [];
    const { data } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, display_name, avatar_url, n4_email')
      .neq('id', userId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,n4_email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);
    return (data || []) as ChatUserProfile[];
  }, [userId]);

  const selected = conversations.find(c => c.id === selectedId) || null;

  return {
    conversations,
    loading,
    selected,
    selectedId,
    view,
    setView,
    selectConversation,
    createDirectChat,
    createGroupChat,
    addParticipant,
    deleteConversation,
    markRead,
    searchUsers,
    refresh: loadConversations,
  };
}
