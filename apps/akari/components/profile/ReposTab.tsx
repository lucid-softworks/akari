import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyTangledRepo } from '@/bluesky-api';
import type { ProfileTabContentProps } from '@/components/profile/types';

type ReposTabProps = ProfileTabContentProps & {
  handle: string;
};

type RepoItemProps = {
  repo: BlueskyTangledRepo;
};

function RepoItem({ repo }: RepoItemProps) {
  const iconColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const metaTextColor = useThemeColor(
    { light: '#4f5b62', dark: '#9BA1A6' },
    'icon'
  );
  const pillBackground = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.08)', dark: 'rgba(255, 255, 255, 0.08)' },
    'background'
  );

  const repoHandle = `@${repo.value.knot}/${repo.value.name}`;

  return (
    <ThemedCard style={styles.repoCard}>
      <View style={styles.headerRow}>
        <View style={[styles.repoIcon, { borderColor }]}
        >
          <IconSymbol
            name="chevron.left.forwardslash.chevron.right"
            size={20}
            color={accentColor}
          />
        </View>
        <View style={styles.headerContent}>
          <ThemedText style={styles.repoHandle} numberOfLines={1}>
            {repoHandle}
          </ThemedText>
          {repo.value.description ? (
            <ThemedText
              style={[styles.repoDescription, { color: metaTextColor }]}
              numberOfLines={2}
            >
              {repo.value.description}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.languagePill, { backgroundColor: pillBackground }]}>
          <View style={[styles.languageDot, { backgroundColor: accentColor }]} />
          <ThemedText style={[styles.languageText, { color: metaTextColor }]} numberOfLines={1}>
            {repo.value.knot}
          </ThemedText>
        </View>

        <View style={styles.metricItem}>
          <IconSymbol name="star.fill" size={16} color={iconColor} />
          <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>0</ThemedText>
        </View>

        <View style={styles.metricItem}>
          <IconSymbol name="eye.fill" size={16} color={iconColor} />
          <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>0</ThemedText>
        </View>

        <View style={styles.metricItem}>
          <IconSymbol name="person.2.fill" size={16} color={iconColor} />
          <ThemedText style={[styles.metricValue, { color: metaTextColor }]}>0</ThemedText>
        </View>
      </View>

      {repo.value.source ? (
        <ThemedText style={[styles.repoSource, { color: accentColor }]} numberOfLines={1} selectable>
          {repo.value.source}
        </ThemedText>
      ) : null}
    </ThemedCard>
  );
}

export function ReposTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: ReposTabProps) {
  const { t } = useTranslation();
  const { data: repos, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useAuthorRepos(handle);
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);

  const renderItem = useCallback((item: BlueskyTangledRepo) => <RepoItem repo={item} />, []);

  return (
    <ProfileTabFlatList
      data={repos ?? []}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noRepos')}
      pinScrollY={pinScrollY}
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
  repoCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  repoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 6,
  },
  repoHandle: {
    fontSize: 16,
    fontWeight: '600',
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  languageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  repoSource: {
    fontSize: 13,
    fontWeight: '500',
  },
});
