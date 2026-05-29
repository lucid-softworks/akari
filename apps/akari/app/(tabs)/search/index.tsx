import { useLocalSearchParams } from 'expo-router';
import React, { memo, use, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { SearchListHeader } from '@/components/search/SearchListHeader';
import { SearchPostResult } from '@/components/search/SearchPostResult';
import { SearchProfileResult } from '@/components/search/SearchProfileResult';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UnavailableWithoutAppView } from '@/components/UnavailableWithoutAppView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { fontSize, layout, opacity, spacing } from '@/constants/tokens';
import { webScreenContainer } from '@/constants/webStyles';
import { TabChromeContext } from '@/app/(tabs)/_layout';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useSearch } from '@/hooks/queries/useSearch';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useCollapsibleHeader } from '@/hooks/useCollapsibleHeader';
import { useResponsive } from '@/hooks/useResponsive';
import { useSearchForm } from '@/hooks/useSearchForm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { isAppViewRequiredError } from '@/utils/appView';
import { useNavigateToProfile } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

type SearchResult = {
  type: 'profile' | 'post';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

const ESTIMATED_RESULT_ITEM_HEIGHT = 240;
const DEFAULT_HEADER_HEIGHT = 140;

// Memo'd at module scope so the parent's `!appViewEnabled` early return
// can bail without React reconciling the header subtree, and the header
// only re-renders when its own props change. react-doctor's
// rerender-memo-before-early-return rule was previously flagging a
// `useMemo` returning this JSX inside the parent.
const MemoizedSearchListHeader = memo(SearchListHeader);

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const isGuest = useIsGuest();

  const {
    query,
    searchQuery,
    activeTab,
    sort,
    setQuery,
    setActiveTab,
    setSort,
    handleSearch,
    handleClearQuery,
  } = useSearchForm(initialQuery, isGuest);

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<VirtualizedListHandle<SearchResult>>(null);
  const { t } = useTranslation();
  const navigateToProfile = useNavigateToProfile();
  const { isLargeScreen } = useResponsive();
  const { topInset: chromeTopInset } = use(TabChromeContext);
  const isWeb = Platform.OS === 'web';

  const {
    headerHeight,
    headerAnimatedStyle,
    handleHeaderLayout,
    handleScroll,
    snapHeaderOpen,
  } = useCollapsibleHeader(DEFAULT_HEADER_HEIGHT);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    snapHeaderOpen();
  }, [snapHeaderOpen]);

  // Register with the tab scroll registry
  useEffect(() => {
    tabScrollRegistry.register('search', scrollToTop);
  }, [scrollToTop]);

  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#000000' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const placeholderColor = useThemeColor({}, 'icon');
  const appViewEnabled = useAppViewEnabled();

  // Always fetch "all" data; the active tab only filters client-side.
  const {
    data: searchData,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useSearch(searchQuery.trim() || undefined, 'all', 20, sort);

  // Flatten all search results from all pages. Gate on the active query
  // so clearing the input also clears stale results that placeholderData
  // held onto.
  const trimmedSearchQuery = searchQuery.trim();
  const allResults = trimmedSearchQuery
    ? searchData?.pages.flatMap((page) => page.results) || []
    : [];

  const filteredResults = allResults.filter((result) => {
    switch (activeTab) {
      case 'users':
        return result.type === 'profile';
      case 'posts':
        return result.type === 'post';
      case 'all':
      default:
        return true;
    }
  });

  const handleLoadMore = () => {
    // The empty state fills the viewport, so the list's `onEndReached`
    // fires immediately when results are empty. Without this guard,
    // `fetchNextPage` runs against a tab that has nothing to paginate
    // (e.g. the Posts tab in guest mode, where the query short-circuits
    // to `[]`) and the "Loading more results…" footer briefly renders
    // underneath the sign-in CTA.
    if (filteredResults.length === 0) return;
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const handleRefresh = async () => {
    if (searchQuery.trim()) {
      await refetch();
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'profile') {
      return (
        <SearchProfileResult
          profile={item.data}
          borderColor={borderColor}
          textColor={textColor}
          onPress={() => navigateToProfile({ actor: item.data.handle })}
        />
      );
    }
    if (item.type === 'post') {
      return <SearchPostResult post={item.data} />;
    }
    return null;
  };

  // Preserve `null` return semantic (some tests assert on it) by guarding
  // here rather than inside a footer component that always returns JSX.
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    // No items → nothing to "load more" of. Guards against the footer
    // briefly painting beneath the empty-state CTA when a stale
    // pagination request settles after a tab switch.
    if (filteredResults.length === 0) return null;
    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={[styles.loadingText, { color: textColor }]}>
          {t('search.loadingMoreResults')}
        </ThemedText>
      </ThemedView>
    );
  };

  const show = useMemo(
    () => ({
      tabs: trimmedSearchQuery.length > 0,
      sort: trimmedSearchQuery.length > 0 && activeTab === 'posts',
      title: isLargeScreen,
    }),
    [activeTab, isLargeScreen, trimmedSearchQuery],
  );

  if (!appViewEnabled || isAppViewRequiredError(error)) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <UnavailableWithoutAppView feature={t('navigation.search')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <VirtualizedList
        ref={flatListRef}
        data={filteredResults}
        renderItem={renderResult}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={[styles.resultsListContent, { paddingTop: headerHeight }]}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        progressViewOffset={headerHeight}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <SearchEmptyState
            searchQuery={searchQuery}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.message}
            activeTab={activeTab}
            isGuest={isGuest}
            onRetry={() => void refetch()}
          />
        }
        estimatedItemSize={ESTIMATED_RESULT_ITEM_HEIGHT}
        keyboardShouldPersistTaps="handled"
      />
      <Animated.View
        pointerEvents="box-none"
        onLayout={handleHeaderLayout}
        style={[
          // On web pin the header to the viewport so the page itself
          // scrolls underneath it. Large screen: no `left` so it
          // keeps its natural horizontal position (the centered
          // middle column's left edge), width:600 to span the column.
          // Mobile web: full-width strip, offset by the mobile
          // header's height so it sits just under the chrome.
          //
          // On web we also skip `headerAnimatedStyle` — that hook
          // applies `transform: translateY(-h)` as the user scrolls
          // down to collapse the header off-screen. On native that's
          // the desired UX; on web we want the bar genuinely fixed.
          isWeb
            ? isLargeScreen
              ? ({ position: 'fixed', top: 0, width: 600, zIndex: 10 } as object)
              : ({
                  position: 'fixed',
                  top: chromeTopInset,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                } as object)
            : styles.headerOverlay,
          { backgroundColor },
          isWeb ? null : headerAnimatedStyle,
        ]}
      >
        <MemoizedSearchListHeader
          query={query}
          onQueryChange={setQuery}
          onClearQuery={handleClearQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isGuest={isGuest}
          sort={sort}
          onSortChange={setSort}
          show={show}
          topInset={isLargeScreen ? insets.top : 0}
          backgroundColor={backgroundColor}
          borderColor={borderColor}
          textColor={textColor}
          placeholderColor={placeholderColor}
          title={t('navigation.search')}
          inputPlaceholder={t('search.searchInputPlaceholder')}
          searchLabel={t('common.search')}
          searchingLabel={t('search.searching')}
          topLabel={t('search.sortTop')}
          latestLabel={t('search.sortLatest')}
          clearLabel={t('search.clearSearch')}
        />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: layout.tabBarPadding,
  },
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
