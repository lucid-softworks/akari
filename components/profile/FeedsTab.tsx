import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyFeed } from '@/utils/bluesky/types';

type FeedsTabProps = {
  handle: string;
};

type FeedItemProps = {
  feed: BlueskyFeed;
};

function FeedItem({ feed }: FeedItemProps) {
  return (
    <ThemedView style={styles.feedContainer}>
      <ThemedView style={styles.feedHeader}>
        {feed.avatar && <ThemedView style={styles.avatar}>{/* Avatar image would go here */}</ThemedView>}
        <ThemedView style={styles.feedInfo}>
          <ThemedText style={styles.displayName}>{feed.displayName}</ThemedText>
          <ThemedText style={styles.creator}>by @{feed.creator.handle}</ThemedText>
        </ThemedView>
      </ThemedView>

      {feed.description && <ThemedText style={styles.description}>{feed.description}</ThemedText>}

      <ThemedView style={styles.stats}>
        <ThemedText style={styles.stat}>{feed.likeCount} likes</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

export function FeedsTab({ handle }: FeedsTabProps) {
  const { t } = useTranslation();
  const { data: feeds, isLoading } = useAuthorFeeds(handle);

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!feeds || feeds.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noFeeds')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      {feeds.map((feed) => (
        <FeedItem key={feed.uri} feed={feed} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  feedContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e1e5e9',
    marginRight: 12,
  },
  feedInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  creator: {
    fontSize: 14,
    opacity: 0.6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    fontSize: 12,
    opacity: 0.6,
  },
});
