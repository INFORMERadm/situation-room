import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { encryptAES, decryptAES } from '../lib/encryption';
import { getConversationKey, refreshConversationKey } from '../lib/keyManager';
import type { DecryptedMessage, EncryptedMessageRow, ChatUserProfile } from '../types/chat';

export function useMessaging(conversationId: string | null, userId: string | undefined) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileCacheRef = useRef(new Map<string, ChatUserProfile>());
  const keyRef = useRef<CryptoKey | null>(null);

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter(id => !profileCacheRef.current.has(id));
    if (missing.length > 0) {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, display_name, avatar_url, n4_email')
        .in('id', missing);
      (data || []).forEach(p => profileCacheRef.current.set(p.id, p as ChatUserProfile));
    }
  }, []);

  const decryptRow = useCallback(async (row: EncryptedMessageRow, key: CryptoKey): Promise<DecryptedMessage> => {
    let content = '';
    if (row.message_type === 'system') {
      content = (row.metadata as { text?: string })?.text || '[system message]';
    } else if (row.encrypted_content && row.iv) {
      try {
        content = await decryptAES(row.encrypted_content, row.iv, key);
      } catch {
        content = '[unable to decrypt]';
      }
    }

    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      content,
      message_type: row.message_type,
      metadata: row.metadata || {},
      created_at: row.created_at,
      senderProfile: profileCacheRef.current.get(row.sender_id),
    };
  }, []);

  const refreshingRef = useRef(false);

  const decryptBatch = useCallback(async (rows: EncryptedMessageRow[], key: CryptoKey) => {
    return Promise.all(rows.map(r => decryptRow(r, key)));
  }, [decryptRow]);

  const loadMessages = useCallback(async () => {
    if (!conversationId || !userId) return;
    setLoading(true);
    setError(null);

    try {
      const key = await getConversationKey(conversationId, userId);
      if (!key) {
        setError('Unable to retrieve encryption key. Try refreshing.');
        setLoading(false);
        return;
      }
      keyRef.current = key;

      const { data: rows, error: queryError } = await supabase
        .from('messaging_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200);

      if (queryError) {
        console.error('[messaging] Failed to load messages:', queryError);
        setError('Failed to load messages');
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const senderIds = [...new Set(rows.map(r => r.sender_id))];
      await fetchProfiles(senderIds);

      const decrypted = await decryptBatch(rows as EncryptedMessageRow[], key);

      const hasUndecryptable = decrypted.some(m =>
        m.content === '[unable to decrypt]' && m.message_type !== 'system'
      );

      if (hasUndecryptable) {
        const freshKey = await refreshConversationKey(conversationId, userId);
        if (freshKey) {
          keyRef.current = freshKey;
          const retried = await decryptBatch(rows as EncryptedMessageRow[], freshKey);
          setMessages(retried);
          setLoading(false);
          return;
        }
      }

      setMessages(decrypted);
      setLoading(false);
    } catch (e) {
      console.error('[messaging] loadMessages error:', e);
      setError('Failed to decrypt messages');
      setLoading(false);
    }
  }, [conversationId, userId, fetchProfiles, decryptBatch]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    keyRef.current = null;
    if (conversationId && userId) {
      loadMessages();
    }
  }, [conversationId, userId, loadMessages]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaging_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          try {
            const row = payload.new as EncryptedMessageRow;
            if (!keyRef.current) return;
            await fetchProfiles([row.sender_id]);
            const msg = await decryptRow(row, keyRef.current);

            if (msg.content === '[unable to decrypt]') {
              if (!refreshingRef.current) {
                refreshingRef.current = true;
                try {
                  const freshKey = await refreshConversationKey(conversationId, userId);
                  if (freshKey) {
                    keyRef.current = freshKey;
                    const retried = await decryptRow(row, freshKey);
                    if (retried.content !== '[unable to decrypt]') {
                      setMessages(prev => {
                        if (prev.some(m => m.id === retried.id)) return prev;
                        return [...prev, retried];
                      });
                      return;
                    }
                  }
                  loadMessages();
                } finally {
                  refreshingRef.current = false;
                }
              }
              return;
            }

            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          } catch (e) {
            console.error('[messaging] realtime decrypt error:', e);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, userId, fetchProfiles, decryptRow, loadMessages]);

  const sendMessage = useCallback(async (text: string, messageType: 'text' | 'link' | 'ai' = 'text', metadata?: Record<string, unknown>) => {
    if (!conversationId || !userId || !text.trim()) return;
    setSending(true);

    try {
      let key = keyRef.current;
      if (!key) {
        key = await getConversationKey(conversationId, userId);
        if (!key) { setSending(false); return; }
        keyRef.current = key;
      }

      let ciphertext: string;
      let iv: string;
      try {
        const encrypted = await encryptAES(text, key);
        ciphertext = encrypted.ciphertext;
        iv = encrypted.iv;
      } catch {
        const freshKey = await refreshConversationKey(conversationId, userId);
        if (!freshKey) { setSending(false); return; }
        keyRef.current = freshKey;
        const encrypted = await encryptAES(text, freshKey);
        ciphertext = encrypted.ciphertext;
        iv = encrypted.iv;
      }

      await supabase.from('messaging_messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        encrypted_content: ciphertext,
        iv,
        message_type: messageType,
        metadata: metadata || {},
      });

      await supabase
        .from('messaging_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (e) {
      console.error('[messaging] sendMessage error:', e);
    }

    setSending(false);
  }, [conversationId, userId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    await supabase
      .from('messaging_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);

    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [userId]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    deleteMessage,
    refresh: loadMessages,
  };
}
