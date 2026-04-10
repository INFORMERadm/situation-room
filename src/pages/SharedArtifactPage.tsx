import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PptxGenJS from 'pptxgenjs';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function SharedArtifactPage() {
  const { token } = useParams<{ token: string }>();
  const [title, setTitle] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchArtifact = async (pw?: string) => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ action: 'get', token });
      if (pw) params.set('password', pw);
      const res = await fetch(`${API_BASE}/artifact-share?${params}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.password_required && !data.html_content) {
        setTitle(data.title || 'Protected Artifact');
        setPasswordRequired(true);
        if (pw) setPasswordError('Invalid password');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Not found');
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setHtmlContent(data.html_content);
      setPasswordRequired(false);
      setLoading(false);
    } catch {
      setError('Failed to load artifact');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifact();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setPasswordError('');
    await fetchArtifact(password);
    setSubmitting(false);
  };

  const handleDownloadPpt = async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'N4 DataDesk';
    pptx.title = title;

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!doc) return;

    const bodyText = doc.body.innerText || '';
    const lines = bodyText.split('\n').filter((l: string) => l.trim());

    const slide = pptx.addSlide();
    slide.background = { color: '0a0a0a' };
    slide.addText(title, {
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
      extraSlide.addText(title + ' (continued)', {
        x: 0.5, y: 0.3, w: 12.3, h: 0.6,
        fontSize: 16, bold: true, color: '888888', fontFace: 'Arial',
      });
      extraSlide.addText(chunk.join('\n'), {
        x: 0.5, y: 1.0, w: 12.3, h: 6.2,
        fontSize: 10, color: 'cccccc', fontFace: 'Arial', valign: 'top', wrap: true,
      });
    }

    const fileName = title.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName });
  };

  const handleDownloadPdf = () => {
    const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
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
${htmlContent}
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

  const wrappedHtml = htmlContent ? `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; }
  body { padding: 24px; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>` : '';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#666', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <div style={{ color: '#666', fontSize: 16 }}>Artifact not found</div>
        <div style={{ color: '#444', fontSize: 12 }}>
          This link may have expired or been deactivated.
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <form
          onSubmit={handlePasswordSubmit}
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 12,
            padding: 32,
            width: 380,
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h2 style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>
            Protected Artifact
          </h2>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
            "{title}"
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#0a0a0a',
              border: `1px solid ${passwordError ? '#ef4444' : '#2a2a2a'}`,
              borderRadius: 8,
              color: '#e0e0e0',
              fontSize: 14,
              marginBottom: passwordError ? 4 : 12,
              outline: 'none',
            }}
          />
          {passwordError && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, textAlign: 'left' }}>
              {passwordError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: submitting ? '#1a1a1a' : '#00bcd4',
              border: 'none',
              borderRadius: 8,
              color: submitting ? '#666' : '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Verifying...' : 'View Artifact'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0d0d0d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleShare}
            style={{
              background: copied ? '#00bcd4' : '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: copied ? '#000' : '#aaa',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: copied ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {copied ? 'Link Copied!' : 'Share'}
          </button>
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
          <span style={{ color: '#444', fontSize: 11, marginLeft: 8 }}>Powered by N4</span>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        sandbox="allow-scripts allow-same-origin"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#0a0a0a',
        }}
        title={title}
      />
    </div>
  );
}
