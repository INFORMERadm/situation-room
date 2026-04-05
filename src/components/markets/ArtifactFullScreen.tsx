import { useEffect, useState } from 'react';
import PptxGenJS from 'pptxgenjs';
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
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; height: 100%; overflow: auto; }
  body { display: flex; flex-direction: column; align-items: center; padding: 16px 40px; }
  body > * { width: 100%; max-width: 1200px; flex-shrink: 0; }
  body > *:only-child, body > div:first-child:last-of-type { flex: 1; display: flex; flex-direction: column; }
  #pres, [id*="pres"] { flex: 1; display: flex; flex-direction: column; }
  #viewport, [id*="viewport"] { flex: 1 !important; height: auto !important; min-height: 0 !important; }
  table { width: 100%; border-collapse: collapse; }
  canvas { max-width: 100%; }
  ul, ol { list-style: none; padding: 0; margin: 0; }
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

  const handleDownloadPpt = async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'N4 DataDesk';
    pptx.title = artifact.title;

    const iframe = document.querySelector('iframe[title="' + artifact.title + '"]') as HTMLIFrameElement;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;

    if (!doc) return;

    const bodyText = doc.body.innerText || '';
    const lines = bodyText.split('\n').filter((l: string) => l.trim());

    const slide = pptx.addSlide();
    slide.background = { color: '0a0a0a' };
    slide.addText(artifact.title, {
      x: 0.5, y: 0.3, w: 12.3, h: 0.8,
      fontSize: 24, bold: true, color: 'e0e0e0',
      fontFace: 'Arial',
    });

    const chunkSize = 30;
    const firstChunk = lines.slice(0, chunkSize);
    slide.addText(firstChunk.join('\n'), {
      x: 0.5, y: 1.2, w: 12.3, h: 6.0,
      fontSize: 10, color: 'cccccc',
      fontFace: 'Arial', valign: 'top',
      wrap: true,
    });

    for (let i = chunkSize; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const extraSlide = pptx.addSlide();
      extraSlide.background = { color: '0a0a0a' };
      extraSlide.addText(artifact.title + ' (continued)', {
        x: 0.5, y: 0.3, w: 12.3, h: 0.6,
        fontSize: 16, bold: true, color: '888888',
        fontFace: 'Arial',
      });
      extraSlide.addText(chunk.join('\n'), {
        x: 0.5, y: 1.0, w: 12.3, h: 6.2,
        fontSize: 10, color: 'cccccc',
        fontFace: 'Arial', valign: 'top',
        wrap: true,
      });
    }

    const fileName = artifact.title.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName });
  };

  const handleDownloadPdf = () => {
    const iframe = document.querySelector('iframe[title="' + artifact.title + '"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

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
            onClick={handleDownloadPpt}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M2 7h20" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
            Download as PPT
          </button>
          <button
            onClick={handleDownloadPdf}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 18 15 15" />
            </svg>
            Download as PDF
          </button>
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
