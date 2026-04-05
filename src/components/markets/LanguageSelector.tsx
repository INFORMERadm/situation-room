import { useState, useRef, useEffect, useCallback } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'ka', label: 'Georgian' },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(0,188,212,0.08)',
          border: '1px solid #00bcd4',
          borderRadius: 4,
          color: '#00bcd4',
          padding: '4px 8px',
          fontSize: 10,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1" />
          <path d="M22 22l-5-10-5 10M14 18h6" />
        </svg>
        {selected.label}
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: 4,
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 6,
          padding: 4,
          zIndex: 1000,
          maxHeight: 240,
          overflowY: 'auto',
          width: 160,
          animation: 'aiFadeIn 0.15s ease-out',
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { onChange(lang.code); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '5px 10px',
                background: lang.code === value ? 'rgba(0,188,212,0.12)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                color: lang.code === value ? '#00bcd4' : '#ccc',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (lang.code !== value) e.currentTarget.style.background = '#222'; }}
              onMouseLeave={e => { if (lang.code !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
