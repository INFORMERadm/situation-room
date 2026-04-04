import { useState, useRef, useEffect } from 'react';
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
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: auto; max-height: 600px; }
  body { padding: 16px; }
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
    var maxH = 650;
    var minH = 300;
    var debounceTimer = null;
    var reportCount = 0;
    var observer = null;
    function reportHeight() {
      if (reportCount > 30) { if (observer) observer.disconnect(); return; }
      reportCount++;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var h = document.body.scrollHeight;
        var children = document.body.children;
        for (var i = 0; i < children.length; i++) {
          var ch = children[i].scrollHeight || children[i].offsetHeight || 0;
          if (ch > h) h = ch;
        }
        h = Math.max(Math.min(h, maxH), minH);
        window.parent.postMessage({ type: 'artifact-height', height: h }, '*');
      }, 150);
    }
    reportHeight();
    observer = new MutationObserver(reportHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('load', reportHeight);
    setTimeout(reportHeight, 300);
    setTimeout(reportHeight, 800);
    setTimeout(reportHeight, 2000);
    setTimeout(function() { if (observer) observer.disconnect(); }, 8000);
  })();
</script>
</body>
</html>`;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.min(Math.max(e.data.height + 16, 300), 650));
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
              onClick={() => setShowShareDialog(true)}
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
