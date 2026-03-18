import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { playChatNotification } from '../lib/alarmSound';

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(result => {
      console.info('[notifications] Permission result:', result);
    });
  }
}

export function showDesktopNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/new_n4_logo.png',
        tag: 'n4-chat-' + Date.now(),
      });
    } catch {
      // silent
    }
  }
}

export function testNotification() {
  playChatNotification();
  showDesktopNotification('N4 Notifications', 'Notifications are working correctly.');
}

interface Options {
  userId: string | undefined;
  chatSidebarOpen: boolean;
}

export function useMessageNotifications({ userId, chatSidebarOpen }: Options) {
  const [convIds, setConvIds] = useState<string[]>([]);
  const [convNames, setConvNames] = useState<Map<string, string>>(new Map());
  const chatOpenRef = useRef(chatSidebarOpen);
  const userIdRef = useRef(userId);

  useEffect(() => {
    chatOpenRef.current = chatSidebarOpen;
  }, [chatSidebarOpen]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const convNamesRef = useRef(convNames);
  useEffect(() => { convNamesRef.current = convNames; }, [convNames]);

  const loadConversationIds = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('messaging_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!data) return;

    const ids = data.map(r => r.conversation_id);
    setConvIds(ids);

    if (ids.length > 0) {
      const { data: convs } = await supabase
        .from('messaging_conversations')
        .select('id, name, type')
        .in('id', ids);

      if (convs) {
        const names = new Map<string, string>();

        const directIds = convs.filter(c => c.type === 'direct').map(c => c.id);
        const otherProfiles = new Map<string, string>();

        if (directIds.length > 0) {
          const { data: parts } = await supabase
            .from('messaging_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', directIds)
            .neq('user_id', userId);

          if (parts && parts.length > 0) {
            const otherUserIds = [...new Set(parts.map(p => p.user_id))];
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('id, first_name, last_name, display_name')
              .in('id', otherUserIds);

            if (profiles) {
              const profileMap = new Map<string, string>();
              profiles.forEach(p => {
                profileMap.set(p.id, p.display_name || `${p.first_name} ${p.last_name}`);
              });

              parts.forEach(p => {
                otherProfiles.set(p.conversation_id, profileMap.get(p.user_id) || 'Unknown');
              });
            }
          }
        }

        convs.forEach(c => {
          if (c.type === 'direct') {
            names.set(c.id, otherProfiles.get(c.id) || 'Direct message');
          } else {
            names.set(c.id, c.name || 'Group chat');
          }
        });

        setConvNames(names);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadConversationIds();
  }, [loadConversationIds]);

  useEffect(() => {
    if (!userId || convIds.length === 0) return;

    const channels = convIds.map(convId => {
      const ch = supabase
        .channel(`notify-msgs-${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messaging_messages',
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            const row = payload.new as {
              sender_id?: string;
              conversation_id?: string;
              message_type?: string;
            };

            if (!row.conversation_id) return;
            if (row.sender_id === userIdRef.current) return;
            if (row.message_type === 'system') return;
            if (chatOpenRef.current) return;

            playChatNotification();

            const name = convNamesRef.current.get(convId);
            showDesktopNotification(
              'New message',
              name ? `Message from ${name}` : 'You have a new message',
            );
          },
        )
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            console.warn(`[notifications] notify-msgs-${convId} channel status:`, status, err);
          } else {
            console.info(`[notifications] notify-msgs-${convId} channel SUBSCRIBED`);
          }
        });

      return ch;
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [userId, convIds]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notify-participant-changes-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messaging_participants', filter: `user_id=eq.${userId}` },
        () => { loadConversationIds(); },
      )
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[notifications] participant-changes channel status:', status, err);
        } else {
          console.info('[notifications] participant-changes channel SUBSCRIBED');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadConversationIds]);
}
