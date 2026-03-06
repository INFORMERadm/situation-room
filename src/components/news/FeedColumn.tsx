import { useState } from 'react';
import type { NewsFeed, FeedItem, FeedType } from '../../hooks/useNewsDeckFeeds';

interface Props {
  title: string;
  feedType: FeedType;
  feeds: NewsFeed[];
  feedItems: Record<string, FeedItem[]>;
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
  linkedin: { icon: 'in', text: 'Add LinkedIn profile or company URLs to track' },
  rss: { icon: 'RSS', text: 'Add RSS feed URLs to aggregate news' },
  youtube: { icon: 'YT', text: 'Add YouTube channel URLs to track videos' },
};

function FeedItemCard({ item, feedType }: { item: FeedItem; feedType: FeedType }) {
  const [hovered, setHovered] = useState(false);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

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
        background: hovered ? '#141414' : 'transparent',
        transition: 'background 0.15s',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        {(feedType === 'youtube' && item.thumbnail) && (
          <img
            src={item.thumbnail}
            alt=""
            style={{
              width: 120,
              height: 68,
              borderRadius: 4,
              objectFit: 'cover',
              flexShrink: 0,
              background: '#222',
            }}
          />
        )}
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
      </div>
    </a>
  );
}

function LinkedInFeedCard({ feed, onRemove }: { feed: NewsFeed; onRemove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid #1a1a1a',
        background: hovered ? '#141414' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        background: '#0a66c2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        color: '#fff',
        flexShrink: 0,
      }}>
        in
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={feed.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: hovered ? '#ff9800' : '#e0e0e0',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
        >
          {feed.display_name}
        </a>
        <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
          LinkedIn Profile
        </div>
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(feed.id); }}
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 14,
            borderRadius: 3,
          }}
          title="Remove"
        >
          x
        </button>
      )}
    </div>
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

export default function FeedColumn({ title, feedType, feeds, feedItems, onAdd, onRemove, onRefresh }: Props) {
  const emptyInfo = EMPTY_MESSAGES[feedType];

  const mergedItems: FeedItem[] = feedType === 'rss'
    ? feeds
        .flatMap(f => feedItems[f.id] || [])
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    : [];

  const hasAnyRssItems = mergedItems.length > 0;
  const rssLoading = feedType === 'rss' && feeds.length > 0 && !hasAnyRssItems;

  return (
    <div style={columnStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        <button style={addBtnStyle} onClick={onAdd} title={`Add ${title}`}>
          +
        </button>
      </div>

      {feedType === 'rss' && feeds.length > 0 && (
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
        ) : feedType === 'linkedin' ? (
          feeds.map(f => <LinkedInFeedCard key={f.id} feed={f} onRemove={onRemove} />)
        ) : feedType === 'rss' ? (
          rssLoading ? (
            <div style={{ padding: '12px', fontSize: 11, color: '#666', textAlign: 'center' }}>
              Loading feeds...
            </div>
          ) : (
            mergedItems.map(item => <FeedItemCard key={item.id} item={item} feedType={feedType} />)
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
