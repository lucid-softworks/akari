import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { SearchListHeader, type SearchSort, type SearchTabType } from '@/components/search/SearchListHeader';
import { SearchPostResult } from '@/components/search/SearchPostResult';
import { SearchProfileResult } from '@/components/search/SearchProfileResult';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UnavailableWithoutAppView } from '@/components/UnavailableWithoutAppView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { fontSize, layout, opacity, spacing } from '@/constants/tokens';
import { useSearch } from '@/hooks/queries/useSearch';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useCollapsibleHeader } from '@/hooks/useCollapsibleHeader';
import { useResponsive } from '@/hooks/useResponsive';
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

const isHashtagQuery = (value: string) => value.trim().startsWith('#');

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();

  // The deep-linked `?query=` param seeds four pieces of form state on
  // first mount and whenever the URL param flips to a new value. Holding
  // them in a single bag lets the URL sync effect commit atomically
  // (one render, not four) instead of cascading setState calls.
  type SearchForm = {
    query: string;
    searchQuery: string;
    activeTab: SearchTabType;
    sort: SearchSort;
  };
  const buildInitialForm = (raw: string | undefined): SearchForm => {
    const initial = raw ?? '';
    const isHashtag = initial && isHashtagQuery(initial);
    return {
      query: initial,
      searchQuery: initial,
      activeTab: isHashtag ? 'posts' : 'all',
      sort: 'top',
    };
  };
  const [form, setForm] = useState<SearchForm>(() => buildInitialForm(initialQuery));
  const { query, searchQuery, activeTab, sort } = form;
  const setQuery = useCallback((next: string) => setForm((p) => ({ ...p, query: next })), []);
  const setSearchQuery = useCallback(
    (next: string) => setForm((p) => ({ ...p, searchQuery: next })),
    [],
  );
  const setActiveTab = useCallback(
    (next: SearchTabType) => setForm((p) => ({ ...p, activeTab: next })),
    [],
  );
  const setSort = useCallback((next: SearchSort) => setForm((p) => ({ ...p, sort: next })), []);

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<VirtualizedListHandle<SearchResult>>(null);
  const { t } = useTranslation();
  const navigateToProfile = useNavigateToProfile();
  const { isLargeScreen } = useResponsive();

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

  useEffect(() => {
    if (initialQuery === undefined || initialQuery === searchQuery) {
      return;
    }
    setForm((prev) => {
      const isHashtag = isHashtagQuery(initialQuery);
      return {
        query: initialQuery,
        searchQuery: initialQuery,
        activeTab: isHashtag ? 'posts' : prev.activeTab,
        sort: isHashtag ? 'top' : prev.sort,
      };
    });
  }, [initialQuery, searchQuery]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      Keyboard.dismiss();
    }
  }, [query, setSearchQuery]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setSearchQuery('');
  }, [setQuery, setSearchQuery]);

  const handleLoadMore = () => {
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

  const listHeaderComponent = useMemo(
    () => (
      <SearchListHeader
        query={query}
        onQueryChange={setQuery}
        onClearQuery={handleClearQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
    ),
    [
      activeTab,
      backgroundColor,
      borderColor,
      handleClearQuery,
      handleSearch,
      insets.top,
      isLargeScreen,
      isLoading,
      placeholderColor,
      query,
      show,
      sort,
      setActiveTab,
      setQuery,
      setSort,
      t,
      textColor,
    ],
  );

  if (!appViewEnabled || isAppViewRequiredError(error)) {
    return (
      <ThemedView style={styles.container}>
        <UnavailableWithoutAppView feature={t('navigation.search')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
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
            onRetry={() => void refetch()}
          />
        }
        estimatedItemSize={ESTIMATED_RESULT_ITEM_HEIGHT}
        keyboardShouldPersistTaps="handled"
      />
      <Animated.View
        pointerEvents="box-none"
        onLayout={handleHeaderLayout}
        style={[styles.headerOverlay, { backgroundColor }, headerAnimatedStyle]}
      >
        {listHeaderComponent}
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
