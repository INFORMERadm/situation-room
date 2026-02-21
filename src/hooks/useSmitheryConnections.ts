import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SmitheryConnection {
  id: string;
  user_id: string;
  smithery_namespace: string;
  smithery_connection_id: string;
  mcp_url: string;
  display_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useSmitheryConnections(userId: string | undefined) {
  const [connections, setConnections] = useState<SmitheryConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('user_smithery_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setConnections(data || []);
    }
  }, [userId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = useCallback(async (conn: {
    smithery_namespace: string;
    smithery_connection_id: string;
    mcp_url: string;
    display_name: string;
    status?: string;
  }) => {
    if (!userId) return null;
    const { data, error: err } = await supabase
      .from('user_smithery_connections')
      .upsert({
        user_id: userId,
        smithery_namespace: conn.smithery_namespace,
        smithery_connection_id: conn.smithery_connection_id,
        mcp_url: conn.mcp_url,
        display_name: conn.display_name,
        status: conn.status || 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,smithery_connection_id' })
      .select()
      .maybeSingle();
    if (err) {
      setError(err.message);
      return null;
    }
    await fetchConnections();
    return data;
  }, [userId, fetchConnections]);

  const removeConnection = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('user_smithery_connections')
      .delete()
      .eq('id', id);
    if (err) {
      setError(err.message);
    } else {
      setConnections(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  const updateConnectionStatus = useCallback(async (id: string, status: string) => {
    const { error: err } = await supabase
      .from('user_smithery_connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!err) {
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }
  }, []);

  return {
    connections,
    loading,
    error,
    fetchConnections,
    addConnection,
    removeConnection,
    updateConnectionStatus,
  };
}
