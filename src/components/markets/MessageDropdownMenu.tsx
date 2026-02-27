import { useRef, useEffect } from 'react';

export type MessageMenuAction =
  | 'pin'
  | 'delete'
  | 'show-raw'
  | 'play'
  | 'fork-chat'
  | 'copy-formatted'
  | 'edit-canvas'
  | 'exclude-context'
  | 'select-mode'
  | 'copy'
  | 'edit'
  | 'regenerate-from';

interface MenuItem {
  action: MessageMenuAction;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  separator?: boolean;
}

const PIN_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2v8" /><path d="M8 6l8 0" /><path d="M15 6l1 6h-8l1-6" />
    <path d="M12 14v8" /><path d="M9 22h6" />
  </svg>
);

const DELETE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const RAW_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const PLAY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const FORK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
    <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" /><path d="M12 12v3" />
  </svg>
);

const COPY_FMT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    <path d="M13 16l2 2 4-4" />
  </svg>
);

const CANVAS_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18" /><path d="M14 8l4 4-4 4" />
  </svg>
);

const EXCLUDE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <path d="M4.93 4.93l14.14 14.14" />
  </svg>
);

const SELECT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const EDIT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);


const USER_ITEMS: MenuItem[] = [
  { action: 'pin', label: 'Pin', icon: PIN_ICON },
  { action: 'copy', label: 'Copy', icon: COPY_ICON },
  { action: 'edit', label: 'Edit', icon: EDIT_ICON },
  { action: 'show-raw', label: 'Show raw', icon: RAW_ICON },
  { action: 'exclude-context', label: 'Exclude from context', icon: EXCLUDE_ICON },
  { action: 'select-mode', label: 'Enter select mode', icon: SELECT_ICON, separator: true },
  { action: 'delete', label: 'Delete', icon: DELETE_ICON, danger: true, separator: true },
];

const ASSISTANT_ITEMS: MenuItem[] = [
  { action: 'pin', label: 'Pin', icon: PIN_ICON },
  { action: 'delete', label: 'Delete', icon: DELETE_ICON },
  { action: 'show-raw', label: 'Show raw', icon: RAW_ICON },
  { action: 'play', label: 'Play', icon: PLAY_ICON, separator: true },
  { action: 'fork-chat', label: 'Fork chat from here', icon: FORK_ICON },
  { action: 'copy-formatted', label: 'Copy with formatting', icon: COPY_FMT_ICON },
  { action: 'edit-canvas', label: 'Edit in Canvas', icon: CANVAS_ICON },
  { action: 'exclude-context', label: 'Exclude from context', icon: EXCLUDE_ICON, separator: true },
  { action: 'select-mode', label: 'Enter select mode', icon: SELECT_ICON },
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
        borderRadius: 8,
        padding: '4px 0',
        minWidth: 200,
        zIndex: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        animation: 'aiFadeIn 0.12s ease-out',
      }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          onClick={(e) => { e.stopPropagation(); onAction(item.action); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            color: item.danger ? '#ff5252' : '#ccc',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.1s, color 0.1s',
            borderTop: item.separator ? '1px solid #1e1e1e' : 'none',
            marginTop: item.separator ? 2 : 0,
            paddingTop: item.separator ? 10 : 8,
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
