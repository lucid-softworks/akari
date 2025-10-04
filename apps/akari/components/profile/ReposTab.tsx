import { StyleSheet, View } from 'react-native';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyTangledRepo } from '@/bluesky-api';

const ESTIMATED_REPO_CARD_HEIGHT = 168;

type ReposTabProps = {
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

export function ReposTab({ handle }: ReposTabProps) {
  const { t } = useTranslation();
  const { data: repos, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorRepos(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: BlueskyTangledRepo }) => <RepoItem repo={item} />;

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

  if (!repos || repos.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noRepos')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <VirtualizedList
      data={repos}
      renderItem={renderItem}
      keyExtractor={(item) => item.uri}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_REPO_CARD_HEIGHT}
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
