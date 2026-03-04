import { useState } from 'react';
import FeedColumn from './FeedColumn';
import AddFeedModal from './AddFeedModal';
import type { FeedType, ColumnPosition, NewsFeed, FeedItem } from '../../hooks/useNewsDeckFeeds';

interface Props {
  feeds: NewsFeed[];
  feedItems: Record<string, FeedItem[]>;
  loading: boolean;
  onAddFeed: (feedType: FeedType, url: string, displayName: string, columnPosition: ColumnPosition) => Promise<void>;
  onRemoveFeed: (id: string) => Promise<void>;
  onRefreshFeed: (id: string) => Promise<void>;
}

interface ModalState {
  feedType: FeedType;
  columnPosition: ColumnPosition;
}

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  background: '#0a0a0a',
};

export default function NewsDeckPanel({ feeds, feedItems, loading, onAddFeed, onRemoveFeed, onRefreshFeed }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const linkedinFeeds = feeds.filter(f => f.feed_type === 'linkedin');
  const rssFeeds = feeds.filter(f => f.feed_type === 'rss');
  const youtubeFeeds = feeds.filter(f => f.feed_type === 'youtube');

  if (loading) {
    return (
      <div style={{
        ...containerStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#555' }}>Loading feeds...</span>
      </div>
    );
  }

  return (
    <>
      <div style={containerStyle}>
        <FeedColumn
          title="LinkedIn"
          feedType="linkedin"
          feeds={linkedinFeeds}
          feedItems={feedItems}
          onAdd={() => setModal({ feedType: 'linkedin', columnPosition: 'left' })}
          onRemove={onRemoveFeed}
          onRefresh={onRefreshFeed}
        />
        <FeedColumn
          title="RSS Feeds"
          feedType="rss"
          feeds={rssFeeds}
          feedItems={feedItems}
          onAdd={() => setModal({ feedType: 'rss', columnPosition: 'center' })}
          onRemove={onRemoveFeed}
          onRefresh={onRefreshFeed}
        />
        <FeedColumn
          title="YouTube"
          feedType="youtube"
          feeds={youtubeFeeds}
          feedItems={feedItems}
          onAdd={() => setModal({ feedType: 'youtube', columnPosition: 'right' })}
          onRemove={onRemoveFeed}
          onRefresh={onRefreshFeed}
        />
      </div>

      {modal && (
        <AddFeedModal
          feedType={modal.feedType}
          columnPosition={modal.columnPosition}
          onAdd={onAddFeed}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
