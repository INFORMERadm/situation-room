interface Props {
  content: string;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
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
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length > 0 ? parts : [text];
}

function renderTable(lines: string[]): JSX.Element {
  const rows = lines.filter(l => !l.match(/^\s*\|?\s*[-:]+/));
  const parsed = rows.map(row =>
    row.split('|').map(c => c.trim()).filter(Boolean)
  );
  if (parsed.length < 1) return <></>;

  const header = parsed[0];
  const body = parsed.slice(1);

  return (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
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
                whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
                }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AIMessageRenderer({ content }: Props) {
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

    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={key++}>{renderTable(tableLines)}</div>);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 700, margin: '12px 0 4px' }}>
          {renderInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700, margin: '12px 0 4px' }}>
          {renderInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key++} style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '12px 0 6px' }}>
          {renderInline(line.slice(2))}
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
          <span>{renderInline(line.slice(2))}</span>
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
          <span>{renderInline(text)}</span>
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
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}
