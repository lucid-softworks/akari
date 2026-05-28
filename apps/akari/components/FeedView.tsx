import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { Image } from '@/components/Image';
import { PostCard } from '@/components/PostCard';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useFeed } from '@/hooks/queries/useFeed';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { queryKeys } from '@/hooks/queryKeys';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { resolveHandleToDid } from '@/utils/oauth/discovery';

type FeedViewProps = {
  /** Handle or DID of the feed-generator's owner. */
  actor: string;
  /** Record-key of the `app.bsky.feed.generator` record. */
  rKey: string;
};

type FeedListItem = { type: 'empty'; state: 'loading' | 'empty' } | { type: 'post'; item: BlueskyFeedItem };

/**
 * Renders a single feed-generator's posts as a stand-alone screen — used
 * by the per-tab `/profile/<handle>/feed/<rKey>` routes (and the trending
 * bar's tap target). The home tab has its own copy of this layout because
 * it also juggles tab switching, composer FAB, etc.; this component
 * intentionally stays minimal: header with the feed's name + creator,
 * infinite-scrolling list of posts, muted-words and feed-filter passes
 * applied so the global toggles still take effect.
 */
export default function FeedView({ actor, rKey }: FeedViewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const listRef = useRef<VirtualizedListHandle<FeedListItem>>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The feed URI is `at://<did>/app.bsky.feed.generator/<rKey>`. Resolve
  // the actor (handle or DID) to a DID first so we can build it. Cached
  // for 24h via React Query — handle→did mappings rarely change.
  const { data: resolvedDid } = useQuery({
    queryKey: queryKeys.handleToDid(actor),
    queryFn: () => resolveHandleToDid(actor),
    enabled: !!actor && !actor.startsWith('did:'),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const actorDid = actor.startsWith('did:') ? actor : resolvedDid;
  const feedUri = actorDid ? `at://${actorDid}/app.bsky.feed.generator/${rKey}` : null;

  // `useFeed` fetches (topping short pages up to a full batch) and applies
  // the muted-word + per-feed filters, so `allPosts` is render-ready.
  const {
    data: feedData,
    posts: allPosts,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFeed(feedUri ?? null, 20);

  // Fetch the feed-generator's metadata for the header (name, creator,
  // avatar). Cheap and shows up immediately while the post list loads.
  const { data: generatorsData } = useFeedGenerators(feedUri ? [feedUri] : []);
  const feedMeta = generatorsData?.feeds?.[0];

  const feedItems = useMemo<FeedListItem[]>(() => {
    if (allPosts.length === 0) {
      const isLoading = feedLoading || isFetchingNextPage || feedData === undefined;
      return [{ type: 'empty', state: isLoading ? 'loading' : 'empty' }];
    }
    return allPosts.map((item) => ({ type: 'post', item }));
  }, [allPosts, feedData, feedLoading, isFetchingNextPage]);

  // Match the home tab's pagination guards so FlashList web's mid-layout
  // `onEndReached` re-fires don't cascade into dozens of getFeed calls.
  const mountedAtRef = useRef(Date.now());
  const hasScrolledRef = useRef(false);
  const userInteractedRef = useRef(false);

  const handleListScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (event.nativeEvent.contentOffset.y > 256) hasScrolledRef.current = true;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  const loadMore = useCallback(() => {
    if (Date.now() - mountedAtRef.current < 1500) return;
    if (!hasScrolledRef.current && !userInteractedRef.current) return;
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: FeedListItem }) => {
    if (item.type === 'empty') {
      if (item.state === 'loading') return <FeedSkeleton count={6} />;
      return (
        <ThemedView style={styles.empty}>
          <ThemedText style={[styles.emptyText, { color: secondaryText }]}>{t('feed.noPostsInFeed')}</ThemedText>
        </ThemedView>
      );
    }
    return <PostCard post={postCardFromFeedItem(item.item)} />;
  }, [secondaryText, t]);

  const keyExtractor = useCallback((item: FeedListItem, index: number) => {
    if (item.type === 'empty') return `empty-${index}`;
    return item.item.post.uri;
  }, []);

  const listHeaderComponent = useCallback(() => {
    if (!feedMeta) return null;
    return (
      <ThemedView style={[styles.header, { paddingTop: insets.top + spacing.md, borderBottomColor: borderColor }]}>
        {feedMeta.avatar ? (
          <Image source={{ uri: feedMeta.avatar }} style={styles.avatar} contentFit="cover" />
        ) : null}
        <ThemedView style={styles.headerText}>
          <ThemedText style={styles.title}>{feedMeta.displayName}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: secondaryText }]} numberOfLines={1}>
            {t('ui.byCreator', { handle: feedMeta.creator?.handle ?? actor })}
          </ThemedText>
          {feedMeta.description ? (
            <ThemedText style={[styles.description, { color: secondaryText }]}>{feedMeta.description}</ThemedText>
          ) : null}
        </ThemedView>
      </ThemedView>
    );
  }, [actor, borderColor, feedMeta, insets.top, secondaryText, t]);

  const listFooter = isFetchingNextPage ? (
    <ThemedView style={styles.footer}>
      <ActivityIndicator />
    </ThemedView>
  ) : null;

  return (
    <ThemedView style={styles.container}>
      <VirtualizedList
        ref={listRef}
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={320}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={listFooter ?? undefined}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        onScroll={handleListScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={250}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

function postCardFromFeedItem(item: BlueskyFeedItem) {
  // Mirrors the post-shape mapping the home tab uses for PostCard. Kept
  // local to avoid leaking yet another shared util — if a third surface
  // needs it later we can lift this out.
  const post = item.post;
  return {
    id: post.uri,
    text:
      typeof post.record === 'object' && post.record && 'text' in post.record
        ? (post.record as { text: string }).text
        : undefined,
    author: {
      did: post.author.did,
      handle: post.author.handle,
      displayName: post.author.displayName,
      avatar: post.author.avatar,
      verification: post.author.verification,
      labels: post.author.labels,
    },
    createdAt: post.indexedAt,
    likeCount: post.likeCount || 0,
    commentCount: post.replyCount || 0,
    repostCount: post.repostCount || 0,
    embed: post.embed,
    embeds: post.embeds,
    labels: post.labels,
    viewer: post.viewer,
    facets: (post.record as any)?.facets,
    uri: post.uri,
    cid: post.cid,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  avatar: { width: 56, height: 56, borderRadius: 12 },
  headerText: { flex: 1, gap: spacing.xxs },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.sm },
  description: { fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 18 },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
});
