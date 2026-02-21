import { useState } from 'react';
import type { SmitheryConnection } from '../hooks/useSmitheryConnections';

interface MCPConnectionsPanelProps {
  connections: SmitheryConnection[];
  loading: boolean;
  onAdd: (conn: {
    smithery_namespace: string;
    smithery_connection_id: string;
    mcp_url: string;
    display_name: string;
  }) => Promise<unknown>;
  onRemove: (id: string) => void;
  onClose: () => void;
}

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

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
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

const EMPTY_FORM = {
  display_name: '',
  mcp_url: '',
  smithery_namespace: '',
  smithery_connection_id: '',
};

export default function MCPConnectionsPanel({
  connections,
  loading,
  onAdd,
  onRemove,
  onClose,
}: MCPConnectionsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim() || !form.mcp_url.trim()) {
      setFormError('Name and MCP URL are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const namespace = form.smithery_namespace.trim() || 'default';
    const connId = form.smithery_connection_id.trim() || `user-conn-${Date.now()}`;
    const result = await onAdd({
      display_name: form.display_name.trim(),
      mcp_url: form.mcp_url.trim(),
      smithery_namespace: namespace,
      smithery_connection_id: connId,
    });
    setSaving(false);
    if (result) {
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      setFormError('Failed to save connection. Please try again.');
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await onRemove(id);
    setRemovingId(null);
  };

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
        width: 480,
        maxWidth: '90vw',
        maxHeight: '80vh',
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
          padding: '16px 20px',
          borderBottom: '1px solid #1e2330',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f6fc' }}>MCP Connections</div>
            <div style={{ fontSize: 11, color: '#484f58', marginTop: 2 }}>
              Connect Smithery MCP servers for voice and chat tools
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#484f58', fontSize: 12 }}>
              Loading connections...
            </div>
          ) : connections.length === 0 && !showForm ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 12, color: '#484f58', marginBottom: 4 }}>No MCP servers connected</div>
              <div style={{ fontSize: 11, color: '#333' }}>Add a Smithery MCP server to give the AI additional tools</div>
            </div>
          ) : (
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
                  <div style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: conn.status === 'connected' ? '#34d399' : conn.status === 'auth_required' ? '#f59e0b' : '#f87171',
                    flexShrink: 0,
                  }}>
                    {conn.status === 'auth_required' ? 'Auth Required' : conn.status}
                  </div>
                  <button
                    onClick={() => handleRemove(conn.id)}
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
                    title="Remove connection"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} style={{
              marginTop: connections.length > 0 ? 16 : 0,
              padding: '14px',
              background: '#0d1117',
              border: '1px solid #1e2330',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                New Connection
              </div>

              {[
                { label: 'Display Name *', key: 'display_name', placeholder: 'e.g. GitHub', required: true },
                { label: 'MCP Server URL *', key: 'mcp_url', placeholder: 'https://server.smithery.ai/@user/my-server', required: true },
                { label: 'Smithery Namespace', key: 'smithery_namespace', placeholder: 'my-app (optional)' },
                { label: 'Connection ID', key: 'smithery_connection_id', placeholder: 'auto-generated if empty' },
              ].map(field => (
                <div key={field.key}>
                  <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>{field.label}</div>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
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

              {formError && (
                <div style={{ fontSize: 11, color: '#f87171' }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
                  style={{
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid #2d333b',
                    borderRadius: 6,
                    color: '#8b949e',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '6px 14px',
                    background: saving ? '#333' : '#fb8c00',
                    border: 'none',
                    borderRadius: 6,
                    color: saving ? '#666' : '#000',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2330' }}>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'transparent',
                border: '1px solid #fb8c00',
                borderRadius: 6,
                color: '#fb8c00',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,140,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <PlusIcon />
              Add MCP Server
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
