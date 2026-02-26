import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

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

export interface CatalogServer {
  id: string;
  slug: string;
  name: string;
  description: string;
  base_url: string;
  requires_api_key: boolean;
  requires_oauth: boolean;
  api_key_name: string | null;
  smithery_slug: string | null;
  sort_order: number;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function useSmitheryConnections(userId: string | undefined) {
  const [connections, setConnections] = useState<SmitheryConnection[]>([]);
  const [catalog, setCatalog] = useState<CatalogServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const token = await getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/smithery-connect?action=list`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (err) {
      const { data, error: dbErr } = await supabase
        .from('user_smithery_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (dbErr) {
        setError(dbErr.message);
      } else {
        setConnections(data || []);
      }
    }

    setLoading(false);
  }, [userId]);

  const fetchCatalog = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('mcp_servers')
      .select('id, slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!err && data) {
      setCatalog(data as CatalogServer[]);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchCatalog();
  }, [fetchConnections, fetchCatalog]);

  const connectServer = useCallback(async (mcpUrl: string, displayName: string): Promise<{
    success: boolean;
    status?: string;
    authorizationUrl?: string;
    connectionId?: string;
    error?: string;
  }> => {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_BASE}/smithery-connect?action=create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mcpUrl, displayName }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Connection failed (${res.status})`;
        try { msg = JSON.parse(text).error || msg; } catch {}
        return { success: false, error: msg };
      }

      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error };
      }

      if (data.status === 'auth_required' && data.authorizationUrl) {
        sessionStorage.setItem('smithery_pending_connection', data.connectionId);
        return {
          success: true,
          status: 'auth_required',
          authorizationUrl: data.authorizationUrl,
          connectionId: data.connectionId,
        };
      }

      await fetchConnections();
      return { success: true, status: 'connected', connectionId: data.connectionId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
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
    const conn = connections.find(c => c.id === id);
    if (!conn) return;

    const token = await getAuthToken();
    if (token && conn.smithery_connection_id) {
      try {
        await fetch(`${API_BASE}/smithery-connect?action=remove`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId: conn.smithery_connection_id }),
        });
      } catch { /* fallback to local delete */ }
    }

    const { error: err } = await supabase
      .from('user_smithery_connections')
      .delete()
      .eq('id', id);
    if (err) {
      setError(err.message);
    } else {
      setConnections(prev => prev.filter(c => c.id !== id));
    }
  }, [connections]);

  const updateConnectionStatus = useCallback(async (id: string, status: string) => {
    const { error: err } = await supabase
      .from('user_smithery_connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!err) {
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }
  }, []);

  const retryConnection = useCallback(async (connectionId: string): Promise<{
    success: boolean;
    status?: string;
    authorizationUrl?: string;
  }> => {
    const token = await getAuthToken();
    if (!token) return { success: false };

    try {
      const res = await fetch(`${API_BASE}/smithery-connect?action=retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      const data = await res.json();
      if (data.status === 'connected') {
        await fetchConnections();
        return { success: true, status: 'connected' };
      }
      if (data.status === 'auth_required' && data.authorizationUrl) {
        sessionStorage.setItem('smithery_pending_connection', connectionId);
        return { success: true, status: 'auth_required', authorizationUrl: data.authorizationUrl };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }, [fetchConnections]);

  return {
    connections,
    catalog,
    loading,
    error,
    fetchConnections,
    fetchCatalog,
    connectServer,
    addConnection,
    removeConnection,
    updateConnectionStatus,
    retryConnection,
  };
}
