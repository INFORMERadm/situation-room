import { useState } from 'react';
import type { SearchSource, SearchImage } from '../../types/index';

type Tab = 'all' | 'images';

interface Props {
  sources: SearchSource[];
  images: SearchImage[];
  isOpen: boolean;
  onClose: () => void;
}

function AllTab({ sources }: { sources: SearchSource[] }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
            textDecoration: 'none',
            borderBottom: '1px solid #1a1a1a',
            transition: 'background 0.15s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#151515'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #292929',
          }}>
            <img
              src={source.favicon}
              alt=""
              width={18}
              height={18}
              style={{ borderRadius: 3 }}
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = `<span style="color:#888;font-size:11px;font-weight:700">${source.domain.charAt(0).toUpperCase()}</span>`;
                }
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#e0e0e0',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 4,
            }}>
              {source.title}
            </div>
            <div style={{
              color: '#888',
              fontSize: 10,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 4,
            }}>
              {source.snippet}
            </div>
            <div style={{ color: '#666', fontSize: 9 }}>
              {source.domain}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function ImagesTab({ images }: { images: SearchImage[] }) {
  if (images.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 12,
        padding: 24,
      }}>
        No images found
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 8,
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 8,
      alignContent: 'start',
    }}>
      {images.map((img, i) => (
        <a
          key={`${img.imageUrl}-${i}`}
          href={img.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #292929',
            background: '#111',
            transition: 'border-color 0.15s, transform 0.15s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#444';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#292929';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <div style={{
            width: '100%',
            aspectRatio: '4/3',
            overflow: 'hidden',
            background: '#0a0a0a',
          }}>
            <img
              src={img.imageUrl}
              alt={img.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div style={{
            padding: '6px 8px',
            color: '#aaa',
            fontSize: 10,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {img.title}
          </div>
        </a>
      ))}
    </div>
  );
}

export default function SourcesPanel({ sources, images, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  if (!isOpen) return null;

  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      borderLeft: '1px solid #292929',
      background: '#0d0d0d',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      animation: 'aiFadeIn 0.2s ease-out',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #292929',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            color: '#e0e0e0',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}>
            Sources
          </span>
          <span style={{
            background: '#00bcd4',
            color: '#000',
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: 10,
            lineHeight: '16px',
          }}>
            {sources.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e0e0e0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: 4,
        padding: '8px 16px',
        borderBottom: '1px solid #1a1a1a',
        flexShrink: 0,
      }}>
        {([
          { key: 'all' as Tab, label: 'All', icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          )},
          { key: 'images' as Tab, label: 'Images', icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )},
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 20,
                border: isActive ? '1px solid #444' : '1px solid transparent',
                background: isActive ? '#1a1a1a' : 'transparent',
                color: isActive ? '#e0e0e0' : '#888',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#141414';
                  e.currentTarget.style.color = '#bbb';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#888';
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'all' ? (
        <AllTab sources={sources} />
      ) : (
        <ImagesTab images={images} />
      )}
    </div>
  );
}
