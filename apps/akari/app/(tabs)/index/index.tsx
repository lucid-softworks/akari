import { fontSize, layout, opacity, spacing } from '@/constants/tokens';
import { useResponsive } from '@/hooks/useResponsive';
import React, { use, useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedFiltersSheet } from '@/components/FeedFiltersSheet';
import { PollComposer } from '@/components/PollComposer';
import { PostComposer } from '@/components/PostComposer';
import { ReviewComposer } from '@/components/ReviewComposer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedListEmpty } from '@/components/home/FeedListEmpty';
import { FeedListHeader } from '@/components/home/FeedListHeader';
import { FeedPostCard } from '@/components/home/FeedPostCard';
import { HomeFab } from '@/components/home/HomeFab';
import { MastodonAnnouncementsList } from '@/components/home/MastodonAnnouncementsList';
import { MastodonFeedListHeader } from '@/components/home/MastodonFeedListHeader';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useDialogManager } from '@/contexts/DialogContext';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useFeedFilters } from '@/hooks/useFeedFilters';
import { useHomeFeed, type FeedListItem } from '@/hooks/useHomeFeed';
import { useSavedFeedsList } from '@/hooks/useSavedFeedsList';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { TabChromeContext } from '@/app/(tabs)/_layout';
import { webScreenContainer } from '@/constants/webStyles';
import { MASTODON_HOME_FEED, MASTODON_TRENDING_FEED } from '@/utils/mastodon/feed';

// Mirrors the default in `useSelectedFeed` — the bsky discover feed.
// Guests get this as their only feed entry (saved-feeds prefs require
// auth) so they always have something on the home tab.
const DISCOVER_FEED_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [showReviewComposer, setShowReviewComposer] = useState(false);
  const dialogManager = useDialogManager();
  const filterIconColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  // Opaque background for the sticky tabs strip on web — without this
  // the header is transparent, so PostCards scrolling underneath show
  // through and read as if they were "going over" the header.
  const surfaceBackground = useThemeColor({}, 'background');
  const feedListRef = useRef<VirtualizedListHandle<FeedListItem>>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const { topInset: chromeTopInset } = use(TabChromeContext);

  // Create scroll to top function
  const scrollToTop = useCallback(() => {
    // On web the feed scrolls the window and the tab strip sits above the
    // list (sticky, outside it), so the list's offset 0 is *below* the
    // strip — scrolling there lands the page under the tabs. Go to the
    // document top instead. Native keeps the header inside the list, so
    // offset 0 is already the true top.
    if (Platform.OS === 'web') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('index', scrollToTop);
  }, [scrollToTop]);

  const { allFeedsWithCreated, savedFeedsLoading, feedsLoading, refetchFeeds } = useSavedFeedsList();
  const isGuest = useIsGuest();
  const { data: currentAccount } = useCurrentAccount();
  // Mastodon accounts have no saved-feeds / feed-generator concept — the
  // home timeline is the only feed surface for v1. We still call the
  // atproto preference hooks above (and feed-tabs strip below) so hook
  // order stays stable across an account switch; this flag just hides
  // the affordances and skips the saved-feeds loading gate.
  const isMastodon = currentAccount?.provider === 'mastodon';
  // Resolve the discover feed's metadata via the public AppView so the
  // tab label shows the feed creator's real display name ("Discover")
  // instead of a hardcoded string we'd have to translate. The query is
  // a no-op once a real saved-feeds list is loaded, so authed users
  // pay nothing extra here.
  const discoverFeedQuery = useFeedGenerators(isGuest ? [DISCOVER_FEED_URI] : []);

  // Use the custom hook for selected feed management
  const { data: selectedFeed } = useSelectedFeed();
  const setSelectedFeedMutation = useSetSelectedFeed();

  const { filters, anyFilterActive } = useFeedFilters(selectedFeed ?? null);

  // Handle feed selection with scroll to top
  const handleFeedSelection = useCallback(
    (feedUri: string) => {
      setSelectedFeedMutation.mutate(feedUri);
      scrollToTop();
    },
    [scrollToTop, setSelectedFeedMutation],
  );

  const handleShowPoll = useCallback(() => {
    const id = 'poll-composer';
    dialogManager.open({
      id,
      component: <PollComposer onClose={() => dialogManager.close(id)} />,
    });
  }, [dialogManager]);

  const handleShowFilters = useCallback(() => {
    const id = 'feed-filters';
    dialogManager.open({
      id,
      component: (
        <FeedFiltersSheet
          onClose={() => dialogManager.close(id)}
          feedKey={selectedFeed ?? null}
        />
      ),
    });
  }, [dialogManager, selectedFeed]);

  const {
    feedItems,
    isFetchingNextPage,
    refreshing,
    onRefresh,
    loadMorePosts,
    handleListScroll,
    handleScrollBeginDrag,
  } = useHomeFeed(selectedFeed, filters, refetchFeeds);

  const feedTabs = useMemo(() => {
    if (isGuest) {
      // The saved-feeds preference is auth-only — without an account
      // `allFeedsWithCreated` is empty, so the home tab strip would
      // render no tabs at all. Inject the discover feed (the same one
      // `useSelectedFeed` forces guests onto) so there's a visible,
      // selectable tab on the home screen.
      const discoverGenerator = discoverFeedQuery.data?.feeds?.[0];
      return [
        {
          key: DISCOVER_FEED_URI,
          label: discoverGenerator?.displayName ?? '',
        },
      ];
    }
    return allFeedsWithCreated.map((feed) => ({
      key: feed.uri,
      label: feed.displayName,
    }));
  }, [allFeedsWithCreated, discoverFeedQuery.data, isGuest]);

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.type === 'empty') {
        return <FeedListEmpty state={item.state} />;
      }
      if (item.type === 'post-mastodon') {
        return <FeedPostCard kind="mastodon" status={item.status} />;
      }
      return (
        <FeedPostCard kind="atproto" entry={item.item} selectedFeed={selectedFeed ?? undefined} />
      );
    },
    [selectedFeed],
  );

  const keyExtractor = useCallback((item: FeedListItem) => {
    if (item.type === 'empty') {
      return `feed-empty-${item.state}`;
    }
    if (item.type === 'post-mastodon') {
      return `mastodon-${item.status.id}`;
    }
    return `${item.item.post.cid ?? 'unknown'}-${item.item.post.uri}`;
  }, []);

  const listFooterComponent = isFetchingNextPage ? (
    <ThemedView style={styles.loadingMore}>
      <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
    </ThemedView>
  ) : null;

  // Two different "headers" on the home tab depending on protocol:
  //   - atproto: the feed-tabs strip + filter + trending bar. On web it
  //     lives in a sticky wrapper above the list so it pins to the top;
  //     on native it goes inside the list as the sticky list header.
  //   - Mastodon: a slimmer tabs strip (Home / Trending) — no atproto
  //     filter / TrendingBar plumbing applies. Sticky on web, in-list on
  //     native, same as atproto.
  // Announcements (Mastodon-only) sit BELOW the sticky strip and are
  // intentionally NOT sticky — they should scroll out of the way once
  // the user scrolls past, so they're in the `scrollingListHeader` slot.
  const mastodonFeedTabs = useMemo(
    () => [
      { key: MASTODON_HOME_FEED, label: t('home.mastodonHomeTab') },
      { key: MASTODON_TRENDING_FEED, label: t('home.mastodonTrendingTab') },
    ],
    [t],
  );

  // Saved-feeds + feed-generators are atproto-only; for Mastodon they
  // never resolve to anything useful (their queries gate on `pdsUrl`),
  // so don't block the home tab on their loading state.
  if (!isMastodon && (savedFeedsLoading || feedsLoading)) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.subtitle}>{t('feed.loadingFeeds')}</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }
  const stickyTopHeader = isMastodon ? (
    <MastodonFeedListHeader
      isLargeScreen={isLargeScreen}
      insetTop={insets.top}
      feedTabs={mastodonFeedTabs}
      selectedFeed={selectedFeed ?? undefined}
      onTabChange={handleFeedSelection}
    />
  ) : (
    <FeedListHeader
      isLargeScreen={isLargeScreen}
      insetTop={insets.top}
      feedTabs={feedTabs}
      selectedFeed={selectedFeed ?? undefined}
      anyFilterActive={anyFilterActive}
      filterIconColor={filterIconColor}
      onTabChange={handleFeedSelection}
      onShowFilters={handleShowFilters}
    />
  );
  const scrollingListHeader = isMastodon ? <MastodonAnnouncementsList /> : null;

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      {isWeb && stickyTopHeader ? (
        <View
          style={
            ({
              // Sticky (not fixed) so the header sits in the same flow
              // context as the PostCards below it — both centered inside
              // the same body-width column, both rendered at the same
              // sub-pixel x. zIndex forces the header above the list
              // when both are positioned (sticky + relative — RN-Web's
              // default), otherwise later siblings (the feed) paint on
              // top. backgroundColor keeps the strip opaque so cards
              // don't bleed through during scroll.
              position: 'sticky',
              top: chromeTopInset,
              zIndex: 10,
              backgroundColor: surfaceBackground,
            } as object)
          }
        >
          {stickyTopHeader}
        </View>
      ) : null}
      <VirtualizedList
        ref={feedListRef}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={320}
        overscan={3}
        // On web large screens the header is rendered above as a
        // position:fixed bar that sits over the scrolling content —
        // dropping it from the list keeps it pinned independently of
        // the virtualiser's scroll math. On native (and on mobile
        // web), keep it inside the list so FlashList's sticky-header
        // pinning still works.
        ListHeaderComponent={
          // Mastodon always uses the in-list header (announcements scroll
          // with the feed). atproto uses it only on native — the web
          // path renders the sticky feed-tabs strip above instead.
          scrollingListHeader ?? (isWeb ? undefined : stickyTopHeader ?? undefined)
        }
        ListFooterComponent={listFooterComponent ?? undefined}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}
        onScroll={handleListScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={250}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />

      <HomeFab
        onPostPress={() => setShowPostComposer(true)}
        onReviewPress={() => setShowReviewComposer(true)}
        onPollPress={handleShowPoll}
      />

      <PostComposer visible={showPostComposer} onClose={() => setShowPostComposer(false)} />
      <ReviewComposer visible={showReviewComposer} onClose={() => setShowReviewComposer(false)} />
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: layout.tabBarPadding,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    textAlign: 'center',
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingMoreText: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
  },
});
