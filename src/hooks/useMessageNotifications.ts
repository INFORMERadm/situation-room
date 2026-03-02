import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { playChatNotification } from '../lib/alarmSound';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showDesktopNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon_orange.png',
        tag: 'n4-chat-' + Date.now(),
      });
    } catch {
      // silent
    }
  }
}

interface Options {
  userId: string | undefined;
  chatSidebarOpen: boolean;
}

export function useMessageNotifications({ userId, chatSidebarOpen }: Options) {
  const [convIds, setConvIds] = useState<string[]>([]);
  const [convNames, setConvNames] = useState<Map<string, string>>(new Map());
  const chatOpenRef = useRef(chatSidebarOpen);

  useEffect(() => {
    chatOpenRef.current = chatSidebarOpen;
  }, [chatSidebarOpen]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
        let otherProfiles = new Map<string, string>();

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
    if (!userId) return;

    const channel = supabase
      .channel('notify-participant-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messaging_participants', filter: `user_id=eq.${userId}` },
        () => { loadConversationIds(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadConversationIds]);

  const convIdsRef = useRef(convIds);
  useEffect(() => { convIdsRef.current = convIds; }, [convIds]);

  const convNamesRef = useRef(convNames);
  useEffect(() => { convNamesRef.current = convNames; }, [convNames]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('global-msg-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaging_messages',
        },
        (payload) => {
          const row = payload.new as {
            sender_id?: string;
            conversation_id?: string;
            message_type?: string;
          };

          if (!row.conversation_id) return;
          if (row.sender_id === userId) return;
          if (row.message_type === 'system') return;
          if (!convIdsRef.current.includes(row.conversation_id)) return;

          if (chatOpenRef.current) return;

          playChatNotification();

          const name = convNamesRef.current.get(row.conversation_id);
          showDesktopNotification(
            'New message',
            name ? `Message in ${name}` : 'You have a new message',
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
