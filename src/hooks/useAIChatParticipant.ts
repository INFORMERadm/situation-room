import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { encryptAES } from '../lib/encryption';
import { getConversationKey } from '../lib/keyManager';
import type { DecryptedMessage } from '../types/chat';

const HYPERMIND_TRIGGER = /@hypermind/i;

export function useAIChatParticipant(
  conversationId: string | null,
  userId: string | undefined
) {
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasHypermindMention = useCallback((text: string): boolean => {
    return HYPERMIND_TRIGGER.test(text);
  }, []);

  const invokeHypermind = useCallback(async (
    userMessage: string,
    recentMessages: DecryptedMessage[]
  ) => {
    if (!conversationId || !userId || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const context = recentMessages.slice(-15).map(m => ({
        role: m.message_type === 'ai' ? 'ai' : 'user',
        content: m.content,
      }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-operations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'ai-reply',
            conversationId,
            messages: context,
            userMessage,
          }),
        }
      );

      if (!res.ok) return;

      const { reply } = await res.json();
      if (!reply) return;

      const key = await getConversationKey(conversationId, userId);
      if (!key) return;

      const { ciphertext, iv } = await encryptAES(reply, key);

      await supabase.from('messaging_messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        encrypted_content: ciphertext,
        iv,
        message_type: 'ai',
        metadata: { aiModel: 'hypermind-7.0', originSender: userId },
      });

      await supabase
        .from('messaging_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch {
      // silently fail
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [conversationId, userId]);

  return {
    hasHypermindMention,
    invokeHypermind,
    isProcessing,
  };
}
