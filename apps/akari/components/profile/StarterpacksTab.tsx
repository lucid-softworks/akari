import { StyleSheet } from 'react-native';

import type { BlueskyStarterPack } from '@/bluesky-api';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorStarterpacks } from '@/hooks/queries/useAuthorStarterpacks';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type StarterpacksTabProps = {
  handle: string;
};

type StarterpackItemProps = {
  starterpack: BlueskyStarterPack;
};

const ESTIMATED_STARTERPACK_CARD_HEIGHT = 180;

function StarterpackItem({ starterpack }: StarterpackItemProps) {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666666', dark: '#8e8e93' }, 'text');

  return (
    <ThemedView style={[styles.starterpackContainer, { backgroundColor, borderColor }]}>
      <ThemedView style={styles.starterpackContent}>
        <ThemedView style={styles.starterpackHeader}>
          <ThemedView style={styles.starterpackInfo}>
            <ThemedText style={[styles.starterpackName, { color: textColor }]} numberOfLines={1}>
              {starterpack.record.name}
            </ThemedText>
            <ThemedText style={[styles.starterpackCreator, { color: secondaryTextColor }]}>
              {t('ui.byCreator', { handle: starterpack.creator.handle })}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {starterpack.record.description && (
          <ThemedText style={[styles.starterpackDescription, { color: secondaryTextColor }]} numberOfLines={2}>
            {starterpack.record.description}
          </ThemedText>
        )}

        <ThemedView style={styles.starterpackFooter}>
          <ThemedView style={styles.statsRow}>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: textColor }]}>{starterpack.joinedAllTimeCount}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: secondaryTextColor }]}>{t('ui.joined')}</ThemedText>
            </ThemedView>

            {starterpack.joinedWeekCount > 0 && (
              <ThemedView style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: textColor }]}>{starterpack.joinedWeekCount}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: secondaryTextColor }]}>{t('ui.thisWeek')}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

export function StarterpacksTab({ handle }: StarterpacksTabProps) {
  const { t } = useTranslation();
  const { data: starterpacks, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorStarterpacks(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: BlueskyStarterPack }) => <StarterpackItem starterpack={item} />;

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

  if (!starterpacks || starterpacks.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noStarterpacks')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <VirtualizedList
      data={starterpacks}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_STARTERPACK_CARD_HEIGHT}
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
  starterpackContainer: {
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
  starterpackContent: {
    padding: 16,
  },
  starterpackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  starterpackInfo: {
    flex: 1,
  },
  starterpackName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  starterpackCreator: {
    fontSize: 13,
    fontWeight: '400',
  },
  starterpackDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '400',
  },
  starterpackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
