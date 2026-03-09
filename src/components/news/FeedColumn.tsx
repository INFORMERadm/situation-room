import { useState } from 'react';
import type { NewsFeed, FeedItem, FeedType } from '../../hooks/useNewsDeckFeeds';

interface Props {
  title: string;
  feedType: FeedType;
  feeds: NewsFeed[];
  feedItems: Record<string, FeedItem[]>;
  alarmEnabled?: boolean;
  onToggleAlarm?: (enabled: boolean) => void;
  highlightedPostIds?: Set<string>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRefresh: (id: string) => void;
}

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
  background: '#0a0a0a',
  borderRight: '1px solid #1a1a1a',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid #292929',
  background: '#111',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#ccc',
};

const addBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#ff9800',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  transition: 'background 0.15s',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: 8,
  padding: 24,
  textAlign: 'center',
};

const EMPTY_MESSAGES: Record<FeedType, { icon: string; text: string }> = {
  telegram: { icon: 'TG', text: 'Add Telegram channel URLs to track messages' },
  rss: { icon: 'RSS', text: 'Add RSS feed URLs to aggregate news' },
  youtube: { icon: 'YT', text: 'Add YouTube channel URLs to track videos' },
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function FeedItemCard({ item, feedType, highlighted }: { item: FeedItem; feedType: FeedType; highlighted?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);

  const videoId = feedType === 'youtube' ? extractYouTubeId(item.url) : null;

  if (feedType === 'youtube' && videoId) {
    return (
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        {playing ? (
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            onClick={() => setPlaying(true)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#111', borderRadius: 4, overflow: 'hidden' }}>
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 48,
                height: 34,
                background: hovered ? '#f00' : 'rgba(0,0,0,0.75)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '14px solid #fff',
                  marginLeft: 2,
                }} />
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', lineHeight: 1.35 }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, color: '#777' }}>
            <span style={{ color: '#aaa' }}>{item.source}</span>
            <span>-</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        padding: '10px 12px',
        borderBottom: '1px solid #1a1a1a',
        textDecoration: 'none',
        background: highlighted ? 'rgba(220, 38, 38, 0.18)' : hovered ? '#141414' : 'transparent',
        transition: 'background 0.6s ease-out',
        cursor: 'pointer',
        borderLeft: highlighted ? '3px solid #dc2626' : '3px solid transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: hovered ? '#ff9800' : '#afafaf',
          lineHeight: 1.35,
          transition: 'color 0.15s',
        }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{
            fontSize: 11,
            color: '#afafaf',
            lineHeight: 1.3,
            marginTop: 3,
          }}>
            {item.description}
          </div>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          fontSize: 10,
          color: '#777',
        }}>
          <span style={{ color: '#aaa' }}>{item.source}</span>
          <span>-</span>
          <span>{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}


function FeedSourceHeader({ feed, onRemove, onRefresh }: { feed: NewsFeed; onRemove: (id: string) => void; onRefresh: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: '#111',
        borderBottom: '1px solid #222',
      }}
    >
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#ff9800',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: '#aaa', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {feed.display_name}
      </span>
      {hovered && (
        <>
          <button
            onClick={() => onRefresh(feed.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 11,
              padding: '0 2px',
            }}
            title="Refresh"
          >
            &#8635;
          </button>
          <button
            onClick={() => onRemove(feed.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 12,
              padding: '0 2px',
            }}
            title="Remove"
          >
            x
          </button>
        </>
      )}
    </div>
  );
}

function FeedSourceChip({ feed, onRemove, onRefresh }: { feed: NewsFeed; onRemove: (id: string) => void; onRefresh: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        background: hovered ? '#1e1e1e' : '#151515',
        border: '1px solid #2a2a2a',
        borderRadius: 3,
        fontSize: 10,
        color: '#bbb',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: '#ff9800',
        flexShrink: 0,
      }} />
      <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {feed.display_name}
      </span>
      {hovered && (
        <>
          <button
            onClick={() => onRefresh(feed.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 10,
              padding: 0,
              lineHeight: 1,
            }}
            title="Refresh"
          >
            &#8635;
          </button>
          <button
            onClick={() => onRemove(feed.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
              lineHeight: 1,
            }}
            title="Remove"
          >
            x
          </button>
        </>
      )}
    </div>
  );
}

export default function FeedColumn({ title, feedType, feeds, feedItems, alarmEnabled, onToggleAlarm, highlightedPostIds, onAdd, onRemove, onRefresh }: Props) {
  const [alarmHovered, setAlarmHovered] = useState(false);
  const emptyInfo = EMPTY_MESSAGES[feedType];

  const isMergedType = feedType === 'telegram' || feedType === 'rss' || feedType === 'youtube';

  const mergedItems: FeedItem[] = isMergedType
    ? feeds
        .flatMap(f => feedItems[f.id] || [])
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    : [];

  const hasAnyMergedItems = mergedItems.length > 0;
  const mergedLoading = isMergedType && feeds.length > 0 && !hasAnyMergedItems;

  return (
    <div style={columnStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onToggleAlarm !== undefined && (
            <button
              onClick={() => onToggleAlarm(!alarmEnabled)}
              onMouseEnter={() => setAlarmHovered(true)}
              onMouseLeave={() => setAlarmHovered(false)}
              title={alarmEnabled ? 'Alarm ON — click to mute' : 'Alarm OFF — click to enable'}
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alarmHovered ? '#222' : 'transparent',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s',
                padding: '2px 4px',
                color: alarmEnabled ? '#ff9800' : '#555',
              }}
            >
              {alarmEnabled ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                  <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                  <path d="M18 8a6 6 0 0 0-9.33-5" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          )}
          <button style={addBtnStyle} onClick={onAdd} title={`Add ${title}`}>
            +
          </button>
        </div>
      </div>

      {isMergedType && feeds.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: '6px 10px',
          borderBottom: '1px solid #1a1a1a',
          background: '#0d0d0d',
          flexShrink: 0,
        }}>
          {feeds.map(f => (
            <FeedSourceChip key={f.id} feed={f} onRemove={onRemove} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      <div style={scrollAreaStyle}>
        {feeds.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: '#555',
              border: '1px dashed #333',
            }}>
              {emptyInfo.icon}
            </div>
            <span style={{ fontSize: 11, color: '#777', maxWidth: 180 }}>{emptyInfo.text}</span>
            <button
              onClick={onAdd}
              style={{
                marginTop: 4,
                padding: '5px 14px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 4,
                color: '#ff9800',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Feed
            </button>
          </div>
        ) : isMergedType ? (
          mergedLoading ? (
            <div style={{ padding: '12px', fontSize: 11, color: '#666', textAlign: 'center' }}>
              Loading feeds...
            </div>
          ) : (
            mergedItems.map(item => <FeedItemCard key={item.id} item={item} feedType={feedType} highlighted={highlightedPostIds?.has(item.id)} />)
          )
        ) : (
          feeds.map(feed => {
            const items = feedItems[feed.id] || [];
            return (
              <div key={feed.id}>
                <FeedSourceHeader feed={feed} onRemove={onRemove} onRefresh={onRefresh} />
                {items.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 11, color: '#666', textAlign: 'center' }}>
                    Loading feed...
                  </div>
                ) : (
                  items.map(item => <FeedItemCard key={item.id} item={item} feedType={feedType} />)
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
