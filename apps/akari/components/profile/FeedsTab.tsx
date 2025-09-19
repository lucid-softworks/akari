import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useMemo } from 'react';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';
import type { BlueskyFeed } from '@/bluesky-api';

type FeedsTabProps = {
  handle: string;
};

type FeedItemProps = {
  feed: BlueskyFeed;
};

function FeedItem({ feed }: FeedItemProps) {
  const { colors } = useAppTheme();
  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);
  const iconColor = colors.accent;

  const handlePinPress = () => {
    // TODO: Implement pin functionality
    console.log('Pin feed:', feed.uri);
  };

  return (
    <ThemedView style={[styles.feedContainer, themedStyles.feedContainer]}>
      <ThemedView style={styles.feedContent}>
        <ThemedView style={styles.feedHeader}>
          <ThemedView style={styles.feedInfo}>
            <ThemedText style={styles.feedName} numberOfLines={1}>
              {feed.displayName}
            </ThemedText>
            <ThemedText style={[styles.feedCreator, themedStyles.feedCreator]}>by @{feed.creator.handle}</ThemedText>
          </ThemedView>

          <TouchableOpacity style={[styles.pinButton, themedStyles.pinButton]} onPress={handlePinPress} activeOpacity={0.6}>
            <IconSymbol name="pin" size={18} color={iconColor} />
          </TouchableOpacity>
        </ThemedView>

        {feed.description && (
          <ThemedText style={[styles.feedDescription, themedStyles.feedDescription]} numberOfLines={2}>
            {feed.description}
          </ThemedText>
        )}

        <ThemedView style={styles.feedFooter}>
          <ThemedText style={[styles.likeCount, themedStyles.likeCount]}>{feed.likeCount} likes</ThemedText>

          {feed.acceptsInteractions && (
            <ThemedView style={[styles.interactionIndicator, themedStyles.interactionIndicator]}>
              <ThemedText style={[styles.interactionText, themedStyles.interactionText]}>Interactive</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

export function FeedsTab({ handle }: FeedsTabProps) {
  const { t } = useTranslation();
  const { data: feeds, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorFeeds(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: BlueskyFeed }) => <FeedItem feed={item} />;

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

  if (!feeds || feeds.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noFeeds')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={feeds}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.flatList}
    />
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
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
  feedContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  feedContent: {
    padding: 16,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedInfo: {
    flex: 1,
    marginRight: 12,
  },
  feedName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  feedCreator: {
    fontSize: 13,
    fontWeight: '400',
  },
  pinButton: {
    padding: 6,
    borderRadius: 8,
  },
  feedDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '400',
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  interactionIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  interactionText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

function createThemedStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    feedContainer: {
      backgroundColor: colors.surface,
      borderColor: colors.borderMuted,
      shadowColor: colors.shadow,
    },
    pinButton: {
      backgroundColor: colors.surfaceSecondary,
    },
    feedCreator: {
      color: colors.textSecondary,
    },
    feedDescription: {
      color: colors.textSecondary,
    },
    likeCount: {
      color: colors.textMuted,
    },
    interactionIndicator: {
      backgroundColor: colors.accent,
    },
    interactionText: {
      color: colors.inverseText,
    },
  });
}
