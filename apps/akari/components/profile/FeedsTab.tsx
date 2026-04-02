import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyFeed } from '@/bluesky-api';
import type { ProfileTabContentProps } from '@/components/profile/types';

type FeedsTabProps = ProfileTabContentProps & {
  handle: string;
};

type FeedItemProps = {
  feed: BlueskyFeed;
};

function FeedItem({ feed }: FeedItemProps) {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666666', dark: '#8e8e93' }, 'text');
  const iconColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'text');

  const handlePinPress = () => {
    // TODO: Implement pin functionality
    // TODO: implement pin functionality
  };

  return (
    <ThemedView style={[styles.feedContainer, { backgroundColor, borderColor }]}>
      <ThemedView style={styles.feedContent}>
        <ThemedView style={styles.feedHeader}>
          <ThemedView style={styles.feedInfo}>
            <ThemedText style={[styles.feedName, { color: textColor }]} numberOfLines={1}>
              {feed.displayName}
            </ThemedText>
            <ThemedText style={[styles.feedCreator, { color: secondaryTextColor }]}>{t('ui.byCreator', { handle: feed.creator.handle })}</ThemedText>
          </ThemedView>

          <TouchableOpacity style={styles.pinButton} onPress={handlePinPress} activeOpacity={0.6}>
            <IconSymbol name="pin" size={18} color={iconColor} />
          </TouchableOpacity>
        </ThemedView>

        {feed.description && (
          <ThemedText style={[styles.feedDescription, { color: secondaryTextColor }]} numberOfLines={2}>
            {feed.description}
          </ThemedText>
        )}

        <ThemedView style={styles.feedFooter}>
          <ThemedText style={[styles.likeCount, { color: secondaryTextColor }]}>{t('ui.likes', { count: feed.likeCount })}</ThemedText>

          {feed.acceptsInteractions && (
            <ThemedView style={styles.interactionIndicator}>
              <ThemedText style={styles.interactionText}>{t('ui.interactive')}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

export function FeedsTab({ handle, visibleCount = 10 }: FeedsTabProps) {
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

  const visibleFeeds = feeds.slice(0, visibleCount);

  return (
    <View>
      {visibleFeeds.map((item) => (
        <FeedItem key={item.uri} feed={item} />
      ))}
    </View>
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
  feedContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  interactionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
});
