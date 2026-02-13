import type { SearchProgress } from '../../types/index';

interface Props {
  progress: SearchProgress;
}

const STAGES = [
  { key: 'searching', label: 'Searching the web', icon: 'search' },
  { key: 'reading', label: 'Reading pages', icon: 'read' },
  { key: 'analyzing', label: 'Analyzing results', icon: 'analyze' },
];

function StageIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#00bcd4' : '#444';
  if (type === 'search') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    );
  }
  if (type === 'read') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  );
}

export default function SearchProgressIndicator({ progress }: Props) {
  const currentIdx = STAGES.findIndex(s => s.key === progress.stage);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '8px 16px',
      animation: 'toolCallSlideIn 0.3s ease-out',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(0,188,212,0.06), rgba(0,188,212,0.02))',
        border: '1px solid rgba(0,188,212,0.15)',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(0,188,212,0.06), transparent)',
          backgroundSize: '200% 100%',
          animation: 'toolCallShimmer 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
          {STAGES.map((stage, i) => {
            const isActive = stage.key === progress.stage;
            const isDone = i < currentIdx;
            const color = isActive ? '#00bcd4' : isDone ? '#00c853' : '#444';

            return (
              <div
                key={stage.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <div style={{ animation: 'toolCallSpin 0.8s linear infinite' }}>
                    <StageIcon type={stage.icon} active={true} />
                  </div>
                ) : (
                  <StageIcon type={stage.icon} active={false} />
                )}
                <span style={{
                  color,
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.2,
                  whiteSpace: 'nowrap',
                }}>
                  {stage.label}
                  {isActive && progress.count ? ` (${progress.count})` : ''}
                </span>

                {i < STAGES.length - 1 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDone ? '#00c853' : '#333'} strokeWidth="2" style={{ marginLeft: 4 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
