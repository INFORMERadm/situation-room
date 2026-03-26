import { useState, useCallback } from 'react';
import type { UserAlert, NewAlertInput } from '../hooks/useAlerts';

interface Props {
  alerts: UserAlert[];
  loading: boolean;
  onAdd: (input: NewAlertInput) => Promise<UserAlert | null>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAIParse: (text: string) => void;
}

type Tab = 'ai' | 'keyword' | 'price';

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 48,
  bottom: 0,
  width: 360,
  background: '#0d0d0d',
  borderLeft: '1px solid #292929',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  animation: 'slideInRight 0.2s ease',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  borderBottom: '1px solid #292929',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #292929',
  background: '#0a0a0a',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '8px 0',
  background: 'transparent',
  color: active ? '#fff' : '#777',
  border: 'none',
  borderBottom: active ? '2px solid #fff' : '2px solid transparent',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#141414',
  border: '1px solid #333',
  borderRadius: 6,
  color: '#fff',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '8px 10px',
  fontSize: 11,
};

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#1a1a1a',
  border: '1px solid #444',
  borderRadius: 6,
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#888',
  fontWeight: 600,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  marginBottom: 4,
};

export default function AlertsPanel({ alerts, loading, onAdd, onToggle, onDelete, onClose, onAIParse }: Props) {
  const [tab, setTab] = useState<Tab>('ai');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [kwName, setKwName] = useState('');
  const [kwKeywords, setKwKeywords] = useState('');
  const [priceName, setPriceName] = useState('');
  const [priceSymbol, setPriceSymbol] = useState('');
  const [priceCondition, setPriceCondition] = useState<'above' | 'below'>('above');
  const [priceTarget, setPriceTarget] = useState('');

  const handleAISubmit = useCallback(() => {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    onAIParse(aiInput.trim());
    setTimeout(() => {
      setAiLoading(false);
      setAiInput('');
    }, 2000);
  }, [aiInput, aiLoading, onAIParse]);

  const handleKeywordAdd = useCallback(async () => {
    if (!kwKeywords.trim()) return;
    const keywords = kwKeywords.split(',').map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;
    const name = kwName.trim() || keywords.slice(0, 3).join(', ');
    await onAdd({
      alert_type: 'keyword',
      name,
      keywords,
    });
    setKwName('');
    setKwKeywords('');
  }, [kwName, kwKeywords, onAdd]);

  const handlePriceAdd = useCallback(async () => {
    if (!priceSymbol.trim() || !priceTarget.trim()) return;
    const target = parseFloat(priceTarget);
    if (isNaN(target)) return;
    const name = priceName.trim() || `${priceSymbol.toUpperCase()} ${priceCondition} $${target}`;
    await onAdd({
      alert_type: 'price',
      name,
      symbol: priceSymbol.toUpperCase(),
      price_condition: priceCondition,
      price_target: target,
    });
    setPriceName('');
    setPriceSymbol('');
    setPriceTarget('');
  }, [priceName, priceSymbol, priceCondition, priceTarget, onAdd]);

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>Alerts</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      <div style={tabBarStyle}>
        <button style={tabStyle(tab === 'ai')} onClick={() => setTab('ai')}>AI</button>
        <button style={tabStyle(tab === 'keyword')} onClick={() => setTab('keyword')}>Keyword</button>
        <button style={tabStyle(tab === 'price')} onClick={() => setTab('price')}>Price</button>
      </div>

      <div style={{ padding: 16, borderBottom: '1px solid #292929' }}>
        {tab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={labelStyle}>Describe your alert in natural language</div>
            <textarea
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAISubmit(); } }}
              placeholder='e.g. "Alert me when a ballistic missile launch against Israel is detected"'
              style={{
                ...inputStyle,
                minHeight: 64,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleAISubmit}
              disabled={!aiInput.trim() || aiLoading}
              style={{
                ...btnPrimary,
                opacity: !aiInput.trim() || aiLoading ? 0.5 : 1,
              }}
            >
              {aiLoading ? 'Creating alert...' : 'Create Alert'}
            </button>
          </div>
        )}

        {tab === 'keyword' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={labelStyle}>Alert name (optional)</div>
              <input
                value={kwName}
                onChange={e => setKwName(e.target.value)}
                placeholder="e.g. Missile Alert"
                style={smallInputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Keywords (comma-separated)</div>
              <input
                value={kwKeywords}
                onChange={e => setKwKeywords(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleKeywordAdd(); }}
                placeholder="e.g. ballistic missile, Israel, launch"
                style={smallInputStyle}
              />
            </div>
            <button onClick={handleKeywordAdd} disabled={!kwKeywords.trim()} style={{ ...btnPrimary, opacity: !kwKeywords.trim() ? 0.5 : 1 }}>
              Add Keyword Alert
            </button>
          </div>
        )}

        {tab === 'price' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={labelStyle}>Alert name (optional)</div>
              <input
                value={priceName}
                onChange={e => setPriceName(e.target.value)}
                placeholder="e.g. AAPL breakout"
                style={smallInputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Symbol</div>
              <input
                value={priceSymbol}
                onChange={e => setPriceSymbol(e.target.value)}
                placeholder="e.g. AAPL"
                style={smallInputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Condition</div>
                <select
                  value={priceCondition}
                  onChange={e => setPriceCondition(e.target.value as 'above' | 'below')}
                  style={{ ...smallInputStyle, cursor: 'pointer' }}
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Target price</div>
                <input
                  type="number"
                  value={priceTarget}
                  onChange={e => setPriceTarget(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePriceAdd(); }}
                  placeholder="200.00"
                  style={smallInputStyle}
                />
              </div>
            </div>
            <button
              onClick={handlePriceAdd}
              disabled={!priceSymbol.trim() || !priceTarget.trim()}
              style={{ ...btnPrimary, opacity: !priceSymbol.trim() || !priceTarget.trim() ? 0.5 : 1 }}
            >
              Add Price Alert
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 0' }}>
        {loading ? (
          <div style={{ padding: 16, color: '#555', fontSize: 11, textAlign: 'center' }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 16, color: '#555', fontSize: 11, textAlign: 'center' }}>No alerts yet. Create one above.</div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #1a1a1a',
                opacity: alert.enabled ? 1 : 0.5,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: alert.alert_type === 'keyword' ? '#e09444' : '#44a0e0',
                    flexShrink: 0,
                  }}>
                    {alert.alert_type}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#eee',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {alert.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onToggle(alert.id)}
                    title={alert.enabled ? 'Disable' : 'Enable'}
                    style={{
                      width: 28,
                      height: 16,
                      borderRadius: 8,
                      border: 'none',
                      background: alert.enabled ? '#2a6b3a' : '#333',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 2,
                      left: alert.enabled ? 14 : 2,
                      transition: 'left 0.15s',
                    }} />
                  </button>
                  <button
                    onClick={() => onDelete(alert.id)}
                    title="Delete alert"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '0 2px',
                      lineHeight: 1,
                    }}
                  >
                    x
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#777', lineHeight: 1.4 }}>
                {alert.alert_type === 'keyword' ? (
                  <span>{alert.keywords.join(', ')}</span>
                ) : (
                  <span>{alert.symbol} {alert.price_condition} ${alert.price_target?.toFixed(2)}</span>
                )}
              </div>
              <div style={{ fontSize: 9, color: '#555', marginTop: 3 }}>
                Last triggered: {formatTime(alert.last_triggered_at)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #292929',
        fontSize: 9,
        color: '#555',
        textAlign: 'center',
      }}>
        {alerts.filter(a => a.enabled).length} active / {alerts.length} total
      </div>
    </div>
  );
}
