import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { MastodonPostCard } from '@/components/home/MastodonPostCard';
import { ThemedText } from '@/components/ThemedText';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useMastodonStatus, useMastodonStatusContext } from '@/hooks/queries/useMastodonStatus';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonStatus } from '@/utils/mastodon/types';

type MastodonStatusDetailViewProps = {
  statusId: string;
};

type ChainEntry = { status: MastodonStatus };

/**
 * Content-only Mastodon status detail. Mounted by `PostDetailView` when
 * the route's `actor` is a Mastodon handle (`alice@instance.com`) — the
 * route file at `/profile/[handle]/post/[rkey]` is shared with atproto,
 * with rkey carrying Mastodon's status id verbatim.
 *
 * Renders the ancestor chain → focused status → descendants stacked
 * through `MastodonPostCard`. The focused entry gets no special visual
 * treatment yet — atproto's `PostDetailView` instead auto-scrolls the
 * focused post to the top of the viewport on open, which is the more
 * useful affordance (you land on the post you tapped). That scroll
 * behaviour is still to come; for now the focused post just sits in its
 * natural position in the chain.
 *
 * Uses `VirtualizedList` rather than `ScrollView` so the web build picks
 * up `VirtualizedList.web.tsx` (window-virtualised) and the document
 * scrolls instead of an inner container. Matches the atproto post detail
 * + profile + home feed patterns.
 */
export function MastodonStatusDetailView({ statusId }: MastodonStatusDetailViewProps) {
  const { t } = useTranslation();
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const statusQuery = useMastodonStatus(statusId);
  const contextQuery = useMastodonStatusContext(statusId);

  const chain = useMemo<ChainEntry[]>(() => {
    const focused = statusQuery.data;
    const ancestors = contextQuery.data?.ancestors ?? [];
    const descendants = contextQuery.data?.descendants ?? [];
    if (!focused) return [];
    return [
      ...ancestors.map((status) => ({ status })),
      { status: focused },
      ...descendants.map((status) => ({ status })),
    ];
  }, [statusQuery.data, contextQuery.data]);

  const isLoading = statusQuery.isLoading || contextQuery.isLoading;
  const errorMessage = statusQuery.error?.message ?? contextQuery.error?.message;

  const renderItem = useCallback(
    ({ item }: { item: ChainEntry }) => <MastodonPostCard status={item.status} />,
    [],
  );

  const keyExtractor = useCallback((item: ChainEntry) => item.status.id, []);

  const ListEmptyComponent = (
    <View style={styles.centeredState}>
      {isLoading ? (
        <ActivityIndicator />
      ) : errorMessage ? (
        <>
          <ThemedText style={styles.errorTitle}>
            {t('mastodon.statusDetailError')}
          </ThemedText>
          <ThemedText style={[styles.errorMessage, { color: helperColor }]}>
            {errorMessage}
          </ThemedText>
        </>
      ) : (
        <ThemedText style={[styles.errorMessage, { color: helperColor }]}>
          {t('mastodon.statusDetailEmpty')}
        </ThemedText>
      )}
    </View>
  );

  return (
    <VirtualizedList
      data={chain}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={320}
      overscan={2}
      ListEmptyComponent={ListEmptyComponent}
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
});
