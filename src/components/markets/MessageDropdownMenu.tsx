import { useRef, useEffect } from 'react';

export type MessageMenuAction =
  | 'copy'
  | 'copy-markdown'
  | 'edit'
  | 'delete'
  | 'regenerate-from'
  | 'show-raw';

interface MenuItem {
  action: MessageMenuAction;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}

const USER_ITEMS: MenuItem[] = [
  {
    action: 'copy',
    label: 'Copy',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    action: 'edit',
    label: 'Edit',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    action: 'delete',
    label: 'Delete',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
    danger: true,
  },
];

const ASSISTANT_ITEMS: MenuItem[] = [
  {
    action: 'copy',
    label: 'Copy',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    action: 'copy-markdown',
    label: 'Copy as Markdown',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    action: 'show-raw',
    label: 'Show Raw',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    action: 'regenerate-from',
    label: 'Regenerate from here',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
      </svg>
    ),
  },
  {
    action: 'delete',
    label: 'Delete',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
    danger: true,
  },
];

interface Props {
  role: 'user' | 'assistant';
  onAction: (action: MessageMenuAction) => void;
  onClose: () => void;
}

export default function MessageDropdownMenu({ role, onAction, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const items = role === 'user' ? USER_ITEMS : ASSISTANT_ITEMS;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        background: '#141414',
        border: '1px solid #2a2a2a',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 170,
        zIndex: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        animation: 'aiFadeIn 0.12s ease-out',
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.action}
          onClick={(e) => { e.stopPropagation(); onAction(item.action); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 12px',
            background: 'transparent',
            border: 'none',
            color: item.danger ? '#ff5252' : '#ccc',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.1s, color 0.1s',
            marginTop: item.danger && i > 0 ? 2 : 0,
            borderTop: item.danger && i > 0 ? '1px solid #1e1e1e' : 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = item.danger ? 'rgba(255,82,82,0.08)' : '#1e1e1e';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
