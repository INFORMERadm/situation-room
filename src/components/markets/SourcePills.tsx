import type { SearchSource } from '../../types/index';

interface Props {
  sources: SearchSource[];
  onOpenPanel: () => void;
  onSourceClick: (url: string) => void;
}

export default function SourcePills({ sources, onOpenPanel, onSourceClick }: Props) {
  if (sources.length === 0) return null;

  const visible = sources.slice(0, 3);
  const overflow = sources.length - 3;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        {visible.map((s) => (
          <button
            key={s.url}
            onClick={() => onSourceClick(s.url)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#1a1a1a',
              border: '1px solid #292929',
              borderRadius: 8,
              cursor: 'pointer',
              maxWidth: 200,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#444';
              e.currentTarget.style.background = '#222';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#292929';
              e.currentTarget.style.background = '#1a1a1a';
            }}
          >
            <img
              src={s.favicon}
              alt=""
              width={16}
              height={16}
              style={{ borderRadius: 2, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                color: '#999',
                fontSize: 9,
                lineHeight: 1.2,
              }}>
                {s.domain}
              </div>
              <div style={{
                color: '#ccc',
                fontSize: 10,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {s.title}
              </div>
            </div>
          </button>
        ))}

        {overflow > 0 && (
          <button
            onClick={onOpenPanel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#1a1a1a',
              border: '1px solid #292929',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#00bcd4';
              e.currentTarget.style.background = '#1a2a2d';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#292929';
              e.currentTarget.style.background = '#1a1a1a';
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {sources.slice(3, 6).map((s, i) => (
                <img
                  key={i}
                  src={s.favicon}
                  alt=""
                  width={14}
                  height={14}
                  style={{ borderRadius: 2, opacity: 0.8 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ))}
            </div>
            <span style={{ color: '#00bcd4', fontSize: 10, fontWeight: 600 }}>
              +{overflow} sources
            </span>
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        color: '#666',
        fontSize: 9,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        Sources from web search
      </div>
    </div>
  );
}
