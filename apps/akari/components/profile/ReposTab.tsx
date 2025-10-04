import { StyleSheet } from 'react-native';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyTangledRepo } from '@/bluesky-api';

const ESTIMATED_REPO_CARD_HEIGHT = 140;

type ReposTabProps = {
  handle: string;
};

type RepoItemProps = {
  repo: BlueskyTangledRepo;
};

function RepoItem({ repo }: RepoItemProps) {
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666666', dark: '#8e8e93' }, 'text');
  const chipBackground = useThemeColor({ light: '#f2f2f7', dark: '#2c2c2e' }, 'background');
  const chipTextColor = useThemeColor({ light: '#000000', dark: '#f2f2f7' }, 'text');
  const linkColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'text');
  const { locale } = useTranslation();

  const createdAt = repo.value.createdAt ? new Date(repo.value.createdAt) : null;
  const formattedDate = createdAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(createdAt)
    : null;

  return (
    <ThemedView style={[styles.repoContainer, { backgroundColor, borderColor }]}
    >
      <ThemedText style={[styles.repoName, { color: textColor }]} numberOfLines={1}>
        {repo.value.name}
      </ThemedText>

      {repo.value.description && (
        <ThemedText style={[styles.repoDescription, { color: secondaryTextColor }]} numberOfLines={2}>
          {repo.value.description}
        </ThemedText>
      )}

      <ThemedView style={styles.repoMeta}>
        <ThemedView style={[styles.chip, { backgroundColor: chipBackground }]}
        >
          <ThemedText style={[styles.chipText, { color: chipTextColor }]} numberOfLines={1}>
            @{repo.value.knot}
          </ThemedText>
        </ThemedView>

        {repo.value.spindle && (
          <ThemedView style={[styles.chip, { backgroundColor: chipBackground }]}
          >
            <ThemedText style={[styles.chipText, { color: chipTextColor }]} numberOfLines={1}>
              {repo.value.spindle}
            </ThemedText>
          </ThemedView>
        )}

        {formattedDate && (
          <ThemedView style={[styles.chip, { backgroundColor: chipBackground }]}
          >
            <ThemedText style={[styles.chipText, { color: chipTextColor }]} numberOfLines={1}>
              {formattedDate}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {repo.value.source && (
        <ThemedText
          style={[styles.repoSource, { color: linkColor }]}
          numberOfLines={1}
          selectable
        >
          {repo.value.source}
        </ThemedText>
      )}
    </ThemedView>
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
  repoContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 10,
  },
  repoName: {
    fontSize: 17,
    fontWeight: '600',
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  repoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  repoSource: {
    fontSize: 13,
    fontWeight: '500',
  },
});
