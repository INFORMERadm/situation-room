import { useState } from 'react';
import type { SmitheryConnection, CatalogServer } from '../hooks/useSmitheryConnections';

interface MCPConnectionsPanelProps {
  connections: SmitheryConnection[];
  catalog: CatalogServer[];
  loading: boolean;
  onConnectServer: (mcpUrl: string, displayName: string) => Promise<{
    success: boolean;
    status?: string;
    authorizationUrl?: string;
    error?: string;
  }>;
  onRemove: (id: string) => void;
  onRetry: (connectionId: string) => Promise<{
    success: boolean;
    status?: string;
    authorizationUrl?: string;
  }>;
  onClose: () => void;
}

type Tab = 'connections' | 'catalog' | 'custom';

const SERVICE_ICONS: Record<string, string> = {
  'google-gmail': 'M',
  'google-calendar': 'C',
  'google-drive': 'D',
  'notion': 'N',
  'slack': 'S',
  'github': 'G',
  'exa-search': 'E',
  'customgpt-mcp': 'K',
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected' ? '#34d399' :
    status === 'auth_required' ? '#f59e0b' : '#f87171';
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
    }} />
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function ServiceIcon({ slug }: { slug: string }) {
  const letter = SERVICE_ICONS[slug] || slug.charAt(0).toUpperCase();
  const colors: Record<string, string> = {
    'google-gmail': '#ea4335',
    'google-calendar': '#4285f4',
    'google-drive': '#0f9d58',
    'notion': '#fff',
    'slack': '#e01e5a',
    'github': '#fff',
    'exa-search': '#00bcd4',
    'customgpt-mcp': '#fb8c00',
  };
  const bg: Record<string, string> = {
    'google-gmail': '#ea433518',
    'google-calendar': '#4285f418',
    'google-drive': '#0f9d5818',
    'notion': '#ffffff12',
    'slack': '#e01e5a18',
    'github': '#ffffff12',
    'exa-search': '#00bcd418',
    'customgpt-mcp': '#fb8c0018',
  };
  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      background: bg[slug] || '#ffffff08',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: colors[slug] || '#8b949e',
      flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

function ConnectionsList({
  connections,
  onRemove,
  onRetry,
  removingId,
  setRemovingId,
}: {
  connections: SmitheryConnection[];
  onRemove: (id: string) => void;
  onRetry: (connectionId: string) => Promise<{ success: boolean; status?: string; authorizationUrl?: string }>;
  removingId: string | null;
  setRemovingId: (id: string | null) => void;
}) {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (conn: SmitheryConnection) => {
    setRetryingId(conn.id);
    const result = await onRetry(conn.smithery_connection_id);
    if (result.status === 'auth_required' && result.authorizationUrl) {
      window.location.href = result.authorizationUrl;
      return;
    }
    setRetryingId(null);
  };

  if (connections.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 12, color: '#484f58', marginBottom: 4 }}>No integrations connected yet</div>
        <div style={{ fontSize: 11, color: '#333' }}>Browse the catalog to connect your first service</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {connections.map(conn => (
        <div key={conn.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          background: '#0d1117',
          border: '1px solid #1e2330',
          borderRadius: 8,
        }}>
          <StatusDot status={conn.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {conn.display_name}
            </div>
            <div style={{ fontSize: 10, color: '#484f58', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {conn.mcp_url}
            </div>
          </div>
          {conn.status === 'auth_required' && (
            <button
              onClick={() => handleRetry(conn)}
              disabled={retryingId === conn.id}
              style={{
                padding: '4px 10px',
                background: '#f59e0b18',
                border: '1px solid #f59e0b40',
                borderRadius: 5,
                color: '#f59e0b',
                fontSize: 10,
                fontWeight: 600,
                cursor: retryingId === conn.id ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: retryingId === conn.id ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {retryingId === conn.id ? 'Connecting...' : 'Authorize'}
            </button>
          )}
          {conn.status !== 'auth_required' && (
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: conn.status === 'connected' ? '#34d399' : '#f87171',
              flexShrink: 0,
            }}>
              {conn.status}
            </div>
          )}
          <button
            onClick={async () => {
              setRemovingId(conn.id);
              await onRemove(conn.id);
              setRemovingId(null);
            }}
            disabled={removingId === conn.id}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#484f58',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              opacity: removingId === conn.id ? 0.4 : 1,
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#484f58'}
          >
            <TrashIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

function CatalogList({
  catalog,
  connections,
  onConnect,
}: {
  catalog: CatalogServer[];
  connections: SmitheryConnection[];
  onConnect: (server: CatalogServer) => void;
}) {
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);

  const connectedUrls = new Set(connections.map(c => c.mcp_url));

  const handleConnect = async (server: CatalogServer) => {
    setConnectingSlug(server.slug);
    await onConnect(server);
    setConnectingSlug(null);
  };

  if (catalog.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#484f58', fontSize: 12 }}>
        No integrations available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {catalog.map(server => {
        const isConnected = connectedUrls.has(server.base_url);
        const isConnecting = connectingSlug === server.slug;

        return (
          <div key={server.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px',
            background: '#0d1117',
            border: '1px solid #1e2330',
            borderRadius: 8,
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={(e) => { if (!isConnected) e.currentTarget.style.borderColor = '#2d333b'; }}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1e2330'}
          >
            <ServiceIcon slug={server.slug} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>
                  {server.name}
                </span>
                {server.requires_oauth && (
                  <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: '#4285f418',
                    color: '#4285f4',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                    OAuth
                  </span>
                )}
                {server.requires_api_key && (
                  <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: '#fb8c0018',
                    color: '#fb8c00',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                    API Key
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#484f58', marginTop: 3, lineHeight: 1.4 }}>
                {server.description}
              </div>
            </div>
            {isConnected ? (
              <div style={{
                padding: '5px 12px',
                background: '#34d39912',
                border: '1px solid #34d39930',
                borderRadius: 6,
                color: '#34d399',
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                Connected
              </div>
            ) : (
              <button
                onClick={() => handleConnect(server)}
                disabled={isConnecting}
                style={{
                  padding: '5px 14px',
                  background: isConnecting ? '#333' : '#fb8c00',
                  border: 'none',
                  borderRadius: 6,
                  color: isConnecting ? '#666' : '#000',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isConnecting ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (!isConnecting) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomConnectionForm({
  onConnect,
}: {
  onConnect: (mcpUrl: string, displayName: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setFormError('Name and URL are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onConnect(url.trim(), name.trim());
      setName('');
      setUrl('');
    } catch {
      setFormError('Failed to connect. Please try again.');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 4,
    }}>
      <div style={{ fontSize: 11, color: '#484f58', lineHeight: 1.5 }}>
        Connect any Smithery-hosted MCP server by providing its URL.
      </div>
      {[
        { label: 'Display Name', value: name, onChange: setName, placeholder: 'e.g. My Custom Server' },
        { label: 'MCP Server URL', value: url, onChange: setUrl, placeholder: 'https://server.smithery.ai/@user/server' },
      ].map(field => (
        <div key={field.label}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>{field.label}</div>
          <input
            type="text"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            required
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#161b22',
              border: '1px solid #2d333b',
              borderRadius: 6,
              color: '#f0f6fc',
              fontSize: 12,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#fb8c00'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#2d333b'}
          />
        </div>
      ))}
      {formError && <div style={{ fontSize: 11, color: '#f87171' }}>{formError}</div>}
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '8px 16px',
          background: saving ? '#333' : '#fb8c00',
          border: 'none',
          borderRadius: 6,
          color: saving ? '#666' : '#000',
          fontSize: 12,
          fontWeight: 600,
          cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit',
          alignSelf: 'flex-end',
        }}
      >
        {saving ? 'Connecting...' : 'Connect'}
      </button>
    </form>
  );
}

export default function MCPConnectionsPanel({
  connections,
  catalog,
  loading,
  onConnectServer,
  onRemove,
  onRetry,
  onClose,
}: MCPConnectionsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleCatalogConnect = async (server: CatalogServer) => {
    setConnectError(null);
    const result = await onConnectServer(server.base_url, server.name);
    if (!result.success) {
      setConnectError(result.error || 'Connection failed');
      return;
    }
    if (result.status === 'auth_required' && result.authorizationUrl) {
      window.location.href = result.authorizationUrl;
    }
  };

  const handleCustomConnect = async (url: string, name: string) => {
    setConnectError(null);
    const result = await onConnectServer(url, name);
    if (!result.success) {
      setConnectError(result.error || 'Connection failed');
      return;
    }
    if (result.status === 'auth_required' && result.authorizationUrl) {
      window.location.href = result.authorizationUrl;
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'catalog', label: 'Integrations' },
    { key: 'connections', label: `Connected (${connections.filter(c => c.status === 'connected').length})` },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 520,
        maxWidth: '92vw',
        maxHeight: '85vh',
        background: '#111318',
        border: '1px solid #1e2330',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f6fc' }}>MCP Integrations</div>
            <div style={{ fontSize: 11, color: '#484f58', marginTop: 2 }}>
              Connect services to give the AI access to your data
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#484f58',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f0f6fc'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#484f58'}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: 0,
          padding: '12px 20px 0',
          borderBottom: '1px solid #1e2330',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setConnectError(null); }}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #fb8c00' : '2px solid transparent',
                color: activeTab === tab.key ? '#f0f6fc' : '#484f58',
                fontSize: 12,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
          {connectError && (
            <div style={{
              padding: '8px 12px',
              background: '#f8717112',
              border: '1px solid #f8717130',
              borderRadius: 6,
              color: '#f87171',
              fontSize: 11,
              marginBottom: 12,
            }}>
              {connectError}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#484f58', fontSize: 12 }}>
              Loading...
            </div>
          ) : activeTab === 'catalog' ? (
            <CatalogList
              catalog={catalog}
              connections={connections}
              onConnect={handleCatalogConnect}
            />
          ) : activeTab === 'connections' ? (
            <ConnectionsList
              connections={connections}
              onRemove={onRemove}
              onRetry={onRetry}
              removingId={removingId}
              setRemovingId={setRemovingId}
            />
          ) : (
            <CustomConnectionForm onConnect={handleCustomConnect} />
          )}
        </div>
      </div>
    </div>
  );
}
