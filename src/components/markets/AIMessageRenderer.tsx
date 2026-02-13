import type { SearchSource } from '../../types/index';

interface Props {
  content: string;
  searchSources?: SearchSource[];
  onOpenSourcesPanel?: () => void;
}

function CitationBadge({ num, source, onOpenPanel }: {
  num: string;
  source?: SearchSource;
  onOpenPanel?: () => void;
}) {
  const handleClick = () => {
    if (source) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    } else if (onOpenPanel) {
      onOpenPanel();
    }
  };

  return (
    <span
      onClick={handleClick}
      title={source ? `${source.title} - ${source.domain}` : `Source ${num}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,188,212,0.12)',
        color: '#00bcd4',
        fontSize: 9,
        fontWeight: 700,
        padding: '0 5px',
        borderRadius: 4,
        marginLeft: 1,
        marginRight: 1,
        cursor: 'pointer',
        verticalAlign: 'super',
        lineHeight: '14px',
        height: 14,
        transition: 'all 0.15s',
        border: '1px solid rgba(0,188,212,0.2)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,188,212,0.25)';
        e.currentTarget.style.borderColor = 'rgba(0,188,212,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(0,188,212,0.12)';
        e.currentTarget.style.borderColor = 'rgba(0,188,212,0.2)';
      }}
    >
      {num}
    </span>
  );
}

function renderInline(
  text: string,
  sources?: SearchSource[],
  onOpenPanel?: () => void,
): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\[(\d+(?:,\s*\d+)*)\](?!\())/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++} style={{ color: '#e0e0e0', fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} style={{
          background: '#1a1a1a',
          padding: '1px 4px',
          borderRadius: 3,
          fontSize: '0.9em',
          color: '#fb8c00',
        }}>{match[4]}</code>
      );
    } else if (match[6] && match[7]) {
      parts.push(
        <a key={key++} href={match[7]} target="_blank" rel="noopener noreferrer" style={{
          color: '#00bcd4',
          textDecoration: 'none',
          borderBottom: '1px solid transparent',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.borderBottomColor = '#00bcd4'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
        >{match[6]}</a>
      );
    } else if (match[9]) {
      const nums = match[9].split(',').map(n => n.trim());
      for (const num of nums) {
        const idx = parseInt(num, 10) - 1;
        const source = sources && idx >= 0 && idx < sources.length ? sources[idx] : undefined;
        parts.push(<CitationBadge key={key++} num={num} source={source} onOpenPanel={onOpenPanel} />);
      }
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length > 0 ? parts : [text];
}

function renderTable(lines: string[], sources?: SearchSource[], onOpenPanel?: () => void): JSX.Element {
  const rows = lines.filter(l => !l.match(/^\s*\|?\s*[-:]+/));
  const parsed = rows.map(row =>
    row.split('|').map(c => c.trim()).filter(Boolean)
  );
  if (parsed.length < 1) return <></>;

  const header = parsed[0];
  const body = parsed.slice(1);

  return (
    <div style={{ overflowX: 'auto', margin: '8px 0', maxWidth: '100%' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        tableLayout: 'fixed',
      }}>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} style={{
                padding: '6px 8px',
                textAlign: 'left',
                color: '#aaa',
                fontWeight: 600,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                borderBottom: '1px solid #292929',
              }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#0d0d0d' : '#151515' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '5px 8px',
                  color: '#ccc',
                  borderBottom: '1px solid #1e1e1e',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {renderInline(cell, sources, onOpenPanel)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AIMessageRenderer({ content, searchSources, onOpenSourcesPanel }: Props) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <div key={key++} style={{ margin: '8px 0' }}>
          {lang && (
            <div style={{
              background: '#1a1a1a',
              padding: '2px 8px',
              fontSize: 9,
              color: '#888',
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottom: '1px solid #292929',
            }}>
              {lang}
            </div>
          )}
          <pre style={{
            background: '#0a0a0a',
            padding: '8px 12px',
            borderRadius: lang ? '0 0 4px 4px' : 4,
            overflow: 'auto',
            fontSize: 10,
            lineHeight: 1.5,
            color: '#ccc',
            margin: 0,
            border: '1px solid #292929',
          }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      elements.push(
        <div key={key++} style={{ margin: '8px 0' }}>
          <img
            src={imgMatch[2]}
            alt={imgMatch[1]}
            style={{
              maxWidth: '100%',
              borderRadius: 6,
              border: '1px solid #292929',
            }}
          />
          {imgMatch[1] && (
            <div style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{imgMatch[1]}</div>
          )}
        </div>
      );
      i++;
      continue;
    }

    if (line.match(/^---+$/)) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #292929', margin: '10px 0' }} />);
      i++;
      continue;
    }

    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={key++}>{renderTable(tableLines, searchSources, onOpenSourcesPanel)}</div>);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 700, margin: '12px 0 4px' }}>
          {renderInline(line.slice(4), searchSources, onOpenSourcesPanel)}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700, margin: '12px 0 4px' }}>
          {renderInline(line.slice(3), searchSources, onOpenSourcesPanel)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key++} style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '12px 0 6px' }}>
          {renderInline(line.slice(2), searchSources, onOpenSourcesPanel)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.match(/^[-*] /)) {
      elements.push(
        <div key={key++} style={{
          display: 'flex',
          gap: 6,
          padding: '2px 0',
          color: '#ccc',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <span style={{ color: '#fb8c00', flexShrink: 0 }}>-</span>
          <span>{renderInline(line.slice(2), searchSources, onOpenSourcesPanel)}</span>
        </div>
      );
      i++;
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)![1];
      const text = line.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={key++} style={{
          display: 'flex',
          gap: 6,
          padding: '2px 0',
          color: '#ccc',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <span style={{ color: '#fb8c00', flexShrink: 0, minWidth: 16 }}>{num}.</span>
          <span>{renderInline(text, searchSources, onOpenSourcesPanel)}</span>
        </div>
      );
      i++;
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      i++;
      continue;
    }

    elements.push(
      <p key={key++} style={{
        color: '#ccc',
        fontSize: 12,
        lineHeight: 1.6,
        margin: '2px 0',
      }}>
        {renderInline(line, searchSources, onOpenSourcesPanel)}
      </p>
    );
    i++;
  }

  return <div style={{ overflow: 'hidden', maxWidth: '100%' }}>{elements}</div>;
}
