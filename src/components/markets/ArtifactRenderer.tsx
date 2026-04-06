import { useState, useRef, useEffect } from 'react';
import PptxGenJS from 'pptxgenjs';
import type { ArtifactData } from '../../hooks/useAIChat';
import ArtifactFullScreen from './ArtifactFullScreen';
import ArtifactShareDialog from './ArtifactShareDialog';

interface Props {
  artifact: ArtifactData;
}

export default function ArtifactRenderer({ artifact }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; }
  body { display: flex; flex-direction: column; align-items: center; padding: 16px 24px; }
  body > * { width: 100%; max-width: 100%; }
  table { width: 100%; border-collapse: collapse; }
  canvas { max-width: 100%; }
  ul, ol { list-style: none; padding: 0; margin: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #444; }
  * { scrollbar-width: thin; scrollbar-color: #333 transparent; }
</style>
</head>
<body>
${artifact.html}
<script>
  (function() {
    var maxH = 800;
    var minH = 400;
    var debounceTimer = null;
    var reportCount = 0;
    var observer = null;
    function getContentHeight() {
      var h = document.body.scrollHeight;
      var children = document.body.children;
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        var sh = el.scrollHeight || 0;
        var oh = el.offsetHeight || 0;
        var rect = el.getBoundingClientRect();
        var ch = Math.max(sh, oh, rect.bottom);
        if (ch > h) h = ch;
      }
      var slides = document.querySelectorAll('[data-slide], [class*="slide"]');
      if (slides.length > 0) {
        var container = slides[0].parentElement;
        if (container) {
          var containerH = container.scrollHeight || container.offsetHeight || 0;
          var navBar = container.nextElementSibling;
          var navH = navBar ? (navBar.offsetHeight || 50) : 50;
          h = Math.max(h, containerH + navH + 80);
        }
      }
      return h;
    }
    function reportHeight() {
      if (reportCount > 40) { if (observer) observer.disconnect(); return; }
      reportCount++;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var h = getContentHeight();
        h = Math.max(Math.min(h, maxH), minH);
        window.parent.postMessage({ type: 'artifact-height', height: h }, '*');
      }, 120);
    }
    reportHeight();
    observer = new MutationObserver(reportHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('load', reportHeight);
    setTimeout(reportHeight, 200);
    setTimeout(reportHeight, 600);
    setTimeout(reportHeight, 1500);
    setTimeout(reportHeight, 3000);
    setTimeout(function() { if (observer) observer.disconnect(); }, 10000);
  })();
</script>
</body>
</html>`;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.min(Math.max(e.data.height + 16, 400), 800));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(artifact.html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPpt = async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'N4 DataDesk';
    pptx.title = artifact.title;

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!doc) return;

    const bodyText = doc.body.innerText || '';
    const lines = bodyText.split('\n').filter((l: string) => l.trim());

    const slide = pptx.addSlide();
    slide.background = { color: '0a0a0a' };
    slide.addText(artifact.title, {
      x: 0.5, y: 0.3, w: 12.3, h: 0.8,
      fontSize: 24, bold: true, color: 'e0e0e0', fontFace: 'Arial',
    });

    const chunkSize = 30;
    const firstChunk = lines.slice(0, chunkSize);
    slide.addText(firstChunk.join('\n'), {
      x: 0.5, y: 1.2, w: 12.3, h: 6.0,
      fontSize: 10, color: 'cccccc', fontFace: 'Arial', valign: 'top', wrap: true,
    });

    for (let i = chunkSize; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const extraSlide = pptx.addSlide();
      extraSlide.background = { color: '0a0a0a' };
      extraSlide.addText(artifact.title + ' (continued)', {
        x: 0.5, y: 0.3, w: 12.3, h: 0.6,
        fontSize: 16, bold: true, color: '888888', fontFace: 'Arial',
      });
      extraSlide.addText(chunk.join('\n'), {
        x: 0.5, y: 1.0, w: 12.3, h: 6.2,
        fontSize: 10, color: 'cccccc', fontFace: 'Arial', valign: 'top', wrap: true,
      });
    }

    const fileName = artifact.title.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName });
  };

  const handleDownloadPdf = () => {
    const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${artifact.title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { padding: 24px 32px; }
  @media print {
    body { padding: 0; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>
${artifact.html}
<script>
  window.onafterprint = function() { window.close(); };
  setTimeout(function() { window.print(); }, 400);
</script>
</body>
</html>`;
    const blob = new Blob([printHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        URL.revokeObjectURL(url);
      };
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        .artifact-panel::-webkit-scrollbar { width: 5px; height: 5px; }
        .artifact-panel::-webkit-scrollbar-track { background: transparent; }
        .artifact-panel::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .artifact-panel::-webkit-scrollbar-thumb:hover { background: #444; }
        .artifact-panel { scrollbar-width: thin; scrollbar-color: #333 transparent; }
      `}</style>
      <div className="artifact-panel" style={{
        border: '1px solid #1e1e1e',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#0d0d0d',
        marginTop: 8,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#111',
          borderBottom: '1px solid #1e1e1e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>{artifact.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleDownloadPpt}
              style={{
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 5,
                color: '#888',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 5,
                color: '#888',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Download as PDF
            </button>
            <button
              onClick={handleCopyHtml}
              style={{
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 5,
                color: copied ? '#00bcd4' : '#888',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              {copied ? 'Copied' : 'Copy HTML'}
            </button>
            <button
              onClick={handleDownloadHtml}
              style={{
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 5,
                color: '#888',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Download
            </button>
            <button
              onClick={() => setShowShareDialog(true)}
              style={{
                background: 'none',
                border: '1px solid #00bcd4',
                borderRadius: 5,
                color: '#00bcd4',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Share
            </button>
            <button
              onClick={() => setShowFullScreen(true)}
              style={{
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 5,
                color: '#888',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Full Screen
            </button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={wrappedHtml}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            background: '#0a0a0a',
            display: 'block',
          }}
          title={artifact.title}
        />
      </div>

      {showFullScreen && (
        <ArtifactFullScreen
          artifact={artifact}
          onClose={() => setShowFullScreen(false)}
          onShare={() => { setShowFullScreen(false); setShowShareDialog(true); }}
        />
      )}

      {showShareDialog && (
        <ArtifactShareDialog
          artifact={artifact}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </>
  );
}
