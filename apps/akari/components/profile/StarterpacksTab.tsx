import { FlatList, StyleSheet } from 'react-native';
import { useMemo } from 'react';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthorStarterpacks } from '@/hooks/queries/useAuthorStarterpacks';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';
import type { BlueskyStarterPack } from '@/bluesky-api';

type StarterpacksTabProps = {
  handle: string;
};

type StarterpackItemProps = {
  starterpack: BlueskyStarterPack;
};

function StarterpackItem({ starterpack }: StarterpackItemProps) {
  const { colors } = useAppTheme();
  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);

  return (
    <ThemedView style={[styles.starterpackContainer, themedStyles.starterpackContainer]}>
      <ThemedView style={styles.starterpackContent}>
        <ThemedView style={styles.starterpackHeader}>
          <ThemedView style={styles.starterpackInfo}>
            <ThemedText style={[styles.starterpackName, themedStyles.starterpackName]} numberOfLines={1}>
              {starterpack.record.name}
            </ThemedText>
            <ThemedText style={[styles.starterpackCreator, themedStyles.starterpackCreator]}>
              by @{starterpack.creator.handle}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {starterpack.record.description && (
          <ThemedText style={[styles.starterpackDescription, themedStyles.starterpackDescription]} numberOfLines={2}>
            {starterpack.record.description}
          </ThemedText>
        )}

        <ThemedView style={styles.starterpackFooter}>
          <ThemedView style={styles.statsRow}>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[styles.statValue, themedStyles.statValue]}>{starterpack.joinedAllTimeCount}</ThemedText>
              <ThemedText style={[styles.statLabel, themedStyles.statLabel]}>joined</ThemedText>
            </ThemedView>

            {starterpack.joinedWeekCount > 0 && (
              <ThemedView style={styles.statItem}>
                <ThemedText style={[styles.statValue, themedStyles.statValue]}>{starterpack.joinedWeekCount}</ThemedText>
                <ThemedText style={[styles.statLabel, themedStyles.statLabel]}>this week</ThemedText>
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
    <FlatList
      data={starterpacks}
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
  starterpackContainer: {
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

function createThemedStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    starterpackContainer: {
      backgroundColor: colors.surface,
      borderColor: colors.borderMuted,
      shadowColor: colors.shadow,
    },
    starterpackName: {
      color: colors.text,
    },
    starterpackCreator: {
      color: colors.textSecondary,
    },
    starterpackDescription: {
      color: colors.textSecondary,
    },
    statValue: {
      color: colors.text,
    },
    statLabel: {
      color: colors.textMuted,
    },
  });
}
