import { StyleSheet } from 'react-native';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorWhtwndPosts } from '@/hooks/queries/useAuthorWhtwndPosts';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';
import type { BlueskyWhtwndEntry } from '@/bluesky-api';

const ESTIMATED_WHITEWIND_CARD_HEIGHT = 220;

export type WhitewindTabProps = {
  handle: string;
  isOwnProfile: boolean;
};

type WhitewindPostItemProps = {
  entry: BlueskyWhtwndEntry;
};

function WhitewindPostItem({ entry }: WhitewindPostItemProps) {
  const titleColor = useThemeColor({ light: '#1b1b1f', dark: '#f2f2f7' }, 'text');
  const metaColor = useThemeColor({ light: '#5f6368', dark: '#9ba1a6' }, 'text');
  const contentColor = useThemeColor({ light: '#1f2023', dark: '#f1f5f9' }, 'text');

  return (
    <ThemedCard style={styles.entryCard}>
      <ThemedText style={[styles.entryTitle, { color: titleColor }]} numberOfLines={2}>
        {entry.value.title}
      </ThemedText>
      <ThemedText style={[styles.entryMeta, { color: metaColor }]} accessibilityRole="text">
        {formatRelativeTime(entry.value.createdAt)}
      </ThemedText>
      <ThemedText style={[styles.entryContent, { color: contentColor }]} numberOfLines={6}>
        {entry.value.content}
      </ThemedText>
    </ThemedCard>
  );
}

export function WhitewindTab({ handle, isOwnProfile }: WhitewindTabProps) {
  const { t } = useTranslation();
  const {
    data: posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuthorWhtwndPosts(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const visiblePosts = (posts ?? []).filter((entry) => isOwnProfile || entry.value.visibility !== 'author');

  const renderItem = ({ item }: { item: BlueskyWhtwndEntry }) => <WhitewindPostItem entry={item} />;

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  };

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!visiblePosts.length) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noPosts')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <VirtualizedList
      data={visiblePosts}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_WHITEWIND_CARD_HEIGHT}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  entryCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  entryMeta: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  entryContent: {
    fontSize: 15,
    lineHeight: 22,
  },
});
