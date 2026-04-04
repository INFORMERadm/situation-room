import { useEffect, useState } from 'react';
import type { ArtifactData } from '../../hooks/useAIChat';

interface Props {
  artifact: ArtifactData;
  onClose: () => void;
  onShare: () => void;
}

export default function ArtifactFullScreen({ artifact, onClose, onShare }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: auto; width: 100%; min-height: 100vh; }
  body { padding: 40px 60px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
  body > * { width: 100%; max-width: 100%; }
  table { width: 100%; border-collapse: collapse; }
  canvas { max-width: 100%; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }
  * { scrollbar-width: thin; scrollbar-color: #333 transparent; }
</style>
</head>
<body>
${artifact.html}
</body>
</html>`;

  const handleDownload = () => {
    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #1e1e1e',
        background: '#111',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>{artifact.title}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleCopy}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: copied ? '#00bcd4' : '#aaa',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied' : 'Copy HTML'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#aaa',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Download
          </button>
          <button
            onClick={onShare}
            style={{
              background: '#1a1a1a',
              border: '1px solid #00bcd4',
              borderRadius: 6,
              color: '#00bcd4',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Share
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#aaa',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>
      <iframe
        srcDoc={wrappedHtml}
        sandbox="allow-scripts allow-same-origin"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#0a0a0a',
        }}
        title={artifact.title}
      />
    </div>
  );
}
