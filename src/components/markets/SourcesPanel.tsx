import type { SearchSource } from '../../types/index';

interface Props {
  sources: SearchSource[];
  isOpen: boolean;
  onClose: () => void;
}

export default function SourcesPanel({ sources, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      borderLeft: '1px solid #292929',
      background: '#0d0d0d',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      animation: 'aiFadeIn 0.2s ease-out',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #292929',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            color: '#e0e0e0',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}>
            Sources
          </span>
          <span style={{
            background: '#00bcd4',
            color: '#000',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: 10,
            lineHeight: '16px',
          }}>
            {sources.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e0e0e0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 16px',
              textDecoration: 'none',
              borderBottom: '1px solid #1a1a1a',
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#151515'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #292929',
            }}>
              <img
                src={source.favicon}
                alt=""
                width={18}
                height={18}
                style={{ borderRadius: 3 }}
                onError={(e) => {
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<span style="color:#888;font-size:11px;font-weight:700">${source.domain.charAt(0).toUpperCase()}</span>`;
                  }
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#e0e0e0',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                {source.title}
              </div>
              <div style={{
                color: '#888',
                fontSize: 10,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                {source.snippet}
              </div>
              <div style={{
                color: '#666',
                fontSize: 9,
              }}>
                {source.domain}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
