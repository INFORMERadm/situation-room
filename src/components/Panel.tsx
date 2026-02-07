interface Props {
  title: string;
  titleColor: string;
  borderColor: string;
  children: React.ReactNode;
}

export default function Panel({ title, titleColor, borderColor, children }: Props) {
  return (
    <div style={{ border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117', height: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 8px 2px', color: titleColor, flexShrink: 0 }}>
        {title}
      </div>
      <div style={{ flex: 1, padding: '4px 8px', overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
