import React, { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { MastodonPostCard } from '@/components/home/MastodonPostCard';
import { MastodonProfileHeader } from '@/components/mastodon/MastodonProfileHeader';
import { ThemedText } from '@/components/ThemedText';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import {
  useMastodonAccountByAcct,
  useMastodonAccountStatuses,
} from '@/hooks/queries/useMastodonProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonStatus } from '@/utils/mastodon/types';

type MastodonProfileViewProps = {
  acct: string;
};

/**
 * Content-only Mastodon profile view: header + infinite statuses list.
 * Mounted by `ProfileView` when the route's handle is a Mastodon acct
 * (`alice@instance.com`) — the route file at `/profile/[handle]` is
 * shared with atproto.
 *
 * Uses `VirtualizedList` rather than `FlatList` so the web build picks
 * up `VirtualizedList.web.tsx` (window-virtualised) and the document
 * scrolls instead of an inner container. Matches the atproto profile +
 * home feed pattern; without it Mastodon profiles would have a nested
 * scroll area while atproto pages scroll the document.
 *
 * Pagination is gated behind a real scroll interaction. Without it
 * `onEndReached` fires immediately after the first page renders (the
 * 20 statuses typically don't fill the viewport on a fresh profile, so
 * the list thinks "near bottom" on mount and keeps re-firing until the
 * server runs out of pages). The home feed gates the same way.
 *
 * No Follow button yet — that needs `GET /api/v1/accounts/relationships`
 * to seed the toggle state. Slated for the next pass.
 */
export function MastodonProfileView({ acct }: MastodonProfileViewProps) {
  const { t } = useTranslation();
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const profile = useMastodonAccountByAcct(acct);
  // Statuses query is keyed by the instance-local id we get back from the
  // acct lookup; it stays disabled until that resolves.
  const statuses = useMastodonAccountStatuses(profile.data?.id);

  const data = useMemo(
    () => statuses.data?.pages.flatMap((p) => p.statuses) ?? [],
    [statuses.data],
  );

  const hasScrolledRef = useRef(false);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y > 200) {
      hasScrolledRef.current = true;
    }
  }, []);

  const onEndReached = useCallback(() => {
    if (!hasScrolledRef.current) return;
    if (statuses.hasNextPage && !statuses.isFetchingNextPage) {
      void statuses.fetchNextPage();
    }
  }, [statuses]);

  const renderItem = useCallback(
    ({ item }: { item: MastodonStatus }) => <MastodonPostCard status={item} />,
    [],
  );

  const keyExtractor = useCallback((item: MastodonStatus) => item.id, []);

  const ListHeaderComponent = profile.data ? (
    <MastodonProfileHeader account={profile.data} />
  ) : null;

  const ListEmptyComponent = (
    <View style={styles.centeredState}>
      {profile.isLoading || statuses.isLoading ? (
        <ActivityIndicator />
      ) : profile.error ? (
        <>
          <ThemedText style={styles.errorTitle}>{t('mastodon.profileError')}</ThemedText>
          <ThemedText style={[styles.errorMessage, { color: helperColor }]}>
            {profile.error.message}
          </ThemedText>
        </>
      ) : (
        <ThemedText style={[styles.errorMessage, { color: helperColor }]}>
          {t('mastodon.profileEmptyPosts')}
        </ThemedText>
      )}
    </View>
  );

  const ListFooterComponent = statuses.isFetchingNextPage ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator />
    </View>
  ) : null;

  return (
    <VirtualizedList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={320}
      overscan={3}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      onScroll={onScroll}
      scrollEventThrottle={250}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centeredState: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  errorMessage: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
