import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import type { BlueskyStarterPack } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { useAuthorStarterpacks } from '@/hooks/queries/useAuthorStarterpacks';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabContentProps } from '@/components/profile/types';

type StarterpacksTabProps = ProfileTabContentProps & {
  handle: string;
};

type StarterpackItemProps = {
  starterpack: BlueskyStarterPack;
};

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

export function StarterpacksTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: StarterpacksTabProps) {
  const { t } = useTranslation();
  const { data: starterpacks, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useAuthorStarterpacks(handle);
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);

  const renderItem = useCallback(
    (item: BlueskyStarterPack) => <StarterpackItem starterpack={item} />,
    [],
  );

  return (
    <ProfileTabFlatList
      data={starterpacks ?? []}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noStarterpacks')}
      pinScrollY={pinScrollY}
      isActive={isActive}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
    onScrollY={onScrollY}
    onHeaderHeightChange={onHeaderHeightChange}
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
