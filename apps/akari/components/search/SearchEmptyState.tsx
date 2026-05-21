import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SearchResultSkeleton } from '@/components/skeletons';
import { ThemedView } from '@/components/ThemedView';
import { spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

import type { SearchTabType } from '@/components/search/SearchListHeader';

export type SearchEmptyStateProps = {
  searchQuery: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  activeTab: SearchTabType;
  /** True when no session is signed in. Post search is auth-gated on
   *  the public AppView (403), so we surface a sign-in CTA instead of
   *  the generic "no posts found" copy that would imply an empty index. */
  isGuest?: boolean;
  onRetry: () => void;
};

/**
 * Renders the placeholder content for an empty result set — skeleton
 * shimmer while loading, a friendly "type to search" prompt when the
 * input is empty, or an error/retry affordance after a failed query.
 */
export function SearchEmptyState({
  searchQuery,
  isLoading,
  isError,
  errorMessage,
  activeTab,
  isGuest,
  onRetry,
}: SearchEmptyStateProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <ThemedView style={styles.emptyState}>
        {Array.from({ length: 5 }).map((_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- placeholder skeletons; fixed-length [0..4] with no identity beyond position
          <SearchResultSkeleton key={`search-skeleton-${index}`} />
        ))}
      </ThemedView>
    );
  }

  // Guest + posts tab + has query → the hook short-circuited before
  // ever calling searchPosts because the public AppView 403s it. Tell
  // the user why the column's empty and route them to sign-in.
  if (isGuest && searchQuery && !isError && activeTab === 'posts') {
    return (
      <EmptyState
        title={t('auth.guestHeroTitle')}
        subtitle={t('auth.guestRequiredSubtitle')}
        action={{ label: t('auth.signInCta'), onPress: () => router.push('/(auth)/signin') }}
      />
    );
  }

  let title: string;
  if (!searchQuery) {
    title = t('search.searchPlaceholder');
  } else if (isError) {
    title = errorMessage || t('search.searchFailed');
  } else if (activeTab === 'users') {
    title = t('search.noUsersFound');
  } else if (activeTab === 'posts') {
    title = t('search.noPostsFound');
  } else {
    title = t('search.noResultsFound');
  }

  return (
    <EmptyState
      title={title}
      action={isError ? { label: t('common.tryAgain'), onPress: onRetry } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  emptyState: {
    paddingVertical: spacing.xxxxl,
    alignItems: 'center',
  },
});
