import type { LinkPreview } from '../../types/chat';

interface Props {
  preview: LinkPreview;
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 8,
  overflow: 'hidden',
  cursor: 'pointer',
  marginTop: 6,
  maxWidth: 300,
};

const thumbStyle: React.CSSProperties = {
  width: 80,
  minHeight: 60,
  objectFit: 'cover',
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 10px 8px 0',
  overflow: 'hidden',
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#e0e0e0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const descStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#999',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: '14px',
};

const siteStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: 0.3,
};

export default function LinkPreviewCard({ preview }: Props) {
  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener');
  };

  if (!preview.title && !preview.description) return null;

  return (
    <div style={cardStyle} onClick={handleClick}>
      {preview.image_url && (
        <img
          src={preview.image_url}
          alt=""
          style={thumbStyle}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={bodyStyle}>
        {preview.site_name && <span style={siteStyle}>{preview.site_name}</span>}
        {preview.title && <span style={titleStyle}>{preview.title}</span>}
        {preview.description && <span style={descStyle}>{preview.description}</span>}
      </div>
    </div>
  );
}
