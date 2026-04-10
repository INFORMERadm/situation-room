import type { Toast as ToastItem } from '../hooks/useToast';

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'none',
};

const colors: Record<ToastItem['type'], { bg: string; border: string; text: string }> = {
  error: { bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)', text: '#fca5a5' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#93c5fd' },
  success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7' },
};

function toastStyle(type: ToastItem['type']): React.CSSProperties {
  const c = colors[type];
  return {
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    pointerEvents: 'auto',
    cursor: 'pointer',
    maxWidth: 420,
    textAlign: 'center',
    animation: 'toastSlideUp 0.25s ease-out',
  };
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} style={toastStyle(t.type)} onClick={() => onDismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
