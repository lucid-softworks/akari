import { Image } from '@/components/Image';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Labels } from '@/components/Labels';

import { PostCard } from '@/components/PostCard';
import { SearchTabs } from '@/components/SearchTabs';
import { SearchResultSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useSearch } from '@/hooks/queries/useSearch';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';

type SearchResult = {
  type: 'profile' | 'post';
  data: any;
};

type SearchTabType = 'all' | 'users' | 'posts';
type SearchSort = 'top' | 'latest';

type SearchListHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onSearch: () => void;
  isLoading: boolean;
  activeTab: SearchTabType;
  onTabChange: (tab: SearchTabType) => void;
  showTabs: boolean;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  showSort: boolean;
  topInset: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  placeholderColor: string;
  title: string;
  inputPlaceholder: string;
  searchLabel: string;
  searchingLabel: string;
  topLabel: string;
  latestLabel: string;
  clearLabel: string;
  showTitle: boolean;
};

const SearchListHeader = React.memo(
  ({
    query,
    onQueryChange,
    onClearQuery,
    onSearch,
    isLoading,
    activeTab,
    onTabChange,
    showTabs,
    sort,
    onSortChange,
    showSort,
    topInset,
    backgroundColor,
    borderColor,
    textColor,
    placeholderColor,
    title,
    inputPlaceholder,
    searchLabel,
    searchingLabel,
    topLabel,
    latestLabel,
    clearLabel,
    showTitle,
  }: SearchListHeaderProps) => {
    return (
      <ThemedView
        style={[
          styles.listHeaderContainer,
          {
            paddingTop: topInset,
            paddingBottom: showTitle ? spacing.md : 0,
          },
        ]}
      >
        {showTitle ? (
          <ThemedView style={styles.header}>
            <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
          </ThemedView>
        ) : null}

        <ThemedView style={styles.searchContainer}>
          <ThemedView
            style={[
              styles.inputWrapper,
              { backgroundColor, borderColor },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder={inputPlaceholder}
              placeholderTextColor={placeholderColor}
              value={query}
              onChangeText={onQueryChange}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={onClearQuery}
                accessibilityRole="button"
                accessibilityLabel={clearLabel}
                hitSlop={8}
                style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="xmark.circle.fill" size={18} color={placeholderColor} />
              </Pressable>
            ) : null}
          </ThemedView>
          <Pressable
            style={({ pressed }) => [styles.searchButton, { backgroundColor: borderColor }, pressed && { opacity: 0.7 }]}
            onPress={onSearch}
            disabled={isLoading}
          >
            <ThemedText style={[styles.searchButtonText, { color: textColor }]}>
              {isLoading ? searchingLabel : searchLabel}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {showTabs ? <SearchTabs activeTab={activeTab} onTabChange={onTabChange} /> : null}

        {showSort ? (
          <ThemedView style={styles.sortContainer}>
            {(['top', 'latest'] as const).map((option) => {
              const isActive = sort === option;
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [styles.sortChip,
                    {
                      backgroundColor: isActive ? textColor : 'transparent',
                      borderColor,
                    }, pressed && { opacity: activeOpacity.default }]}
                  onPress={() => onSortChange(option)}
                  
                >
                  <ThemedText
                    style={[
                      styles.sortChipText,
                      { color: isActive ? backgroundColor : textColor },
                    ]}
                  >
                    {option === 'top' ? topLabel : latestLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        ) : null}
      </ThemedView>
    );
  },
);

SearchListHeader.displayName = 'SearchListHeader';

const ESTIMATED_RESULT_ITEM_HEIGHT = 240;
const DEFAULT_HEADER_HEIGHT = 140;

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const isHashtagQuery = (value: string) => value.trim().startsWith('#');
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
  const setQuery = useCallback(
    (next: string) => setForm((p) => ({ ...p, query: next })),
    [],
  );
  const setSearchQuery = useCallback(
    (next: string) => setForm((p) => ({ ...p, searchQuery: next })),
    [],
  );
  const setActiveTab = useCallback(
    (next: SearchTabType) => setForm((p) => ({ ...p, activeTab: next })),
    [],
  );
  const setSort = useCallback(
    (next: SearchSort) => setForm((p) => ({ ...p, sort: next })),
    [],
  );
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const headerHeightSv = useSharedValue(DEFAULT_HEADER_HEIGHT);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<VirtualizedListHandle<SearchResult>>(null);
  const { t } = useTranslation();
  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();
  const { isLargeScreen } = useResponsive();

  // Create scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    headerTranslateY.value = withTiming(0, { duration: 150 });
  }, [headerTranslateY]);

  // Register with the tab scroll registry
  useEffect(() => {
    tabScrollRegistry.register('search', scrollToTop);
  }, [scrollToTop]);

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const h = event.nativeEvent.layout.height;
      if (h > 0) {
        setHeaderHeight(h);
        headerHeightSv.value = h;
      }
    },
    [headerHeightSv],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.value;
      lastScrollY.value = y;
      if (y <= 0) {
        headerTranslateY.value = 0;
      } else {
        const max = headerHeightSv.value;
        const next = headerTranslateY.value - delta;
        headerTranslateY.value = Math.max(-max, Math.min(0, next));
      }
    },
    [headerHeightSv, headerTranslateY, lastScrollY],
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const backgroundColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#000000',
    },
    'background',
  );

  const textColor = useThemeColor(
    {
      light: '#000000',
      dark: '#ffffff',
    },
    'text',
  );

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  const placeholderColor = useThemeColor({}, 'icon');

  // Use the infinite search hook with searchQuery (not query) - always fetch "all" data
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

  // Flatten all search results from all pages. Gate on the active query so
  // clearing the input also clears stale results that placeholderData held onto.
  const trimmedSearchQuery = searchQuery.trim();
  const allResults = trimmedSearchQuery
    ? searchData?.pages.flatMap((page) => page.results) || []
    : [];

  // Filter results based on active tab
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
  }, [query]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setSearchQuery('');
  }, []);

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

  const renderProfileResult = ({ item }: { item: SearchResult }) => {
    if (item.type !== 'profile') return null;

    const profile = item.data;
    return (
      <Pressable
        style={({ pressed }) => [styles.resultItem, { borderBottomColor: borderColor }, pressed && { opacity: activeOpacity.default }]}
        onPress={() => navigateToProfile({ actor: profile.handle })}
        
      >
        <ThemedView style={styles.profileContainer}>
          {profile.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              style={styles.profileAvatar}
              contentFit="cover"
            />
          ) : null}
          <ThemedView style={styles.profileInfo}>
            <ThemedView style={styles.displayNameRow}>
              <ThemedText style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                {profile.displayName || profile.handle}
              </ThemedText>
              <VerificationBadge
                verification={profile.verification}
                subjectHandle={profile.handle}
                subjectDisplayName={profile.displayName}
                size={fontSize.lg}
              />
            </ThemedView>
            <ThemedText style={[styles.handle, { color: textColor }]}>@{profile.handle}</ThemedText>
            {profile.description ? (
              <ThemedText style={[styles.description, { color: textColor }]} numberOfLines={2}>
                {profile.description}
              </ThemedText>
            ) : null}
            <Labels labels={profile.labels} maxLabels={3} />
          </ThemedView>
        </ThemedView>
      </Pressable>
    );
  };

  const renderPostResult = ({ item }: { item: SearchResult }) => {
    if (item.type !== 'post') return null;

    const post = item.data;

    // Check if this post is a reply and has reply context
    const replyTo = post.reply?.parent
      ? {
          author: {
            handle: post.reply.parent.author?.handle || t('common.unknown'),
            displayName: post.reply.parent.author?.displayName,
          },
          text: post.reply.parent.record?.text,
        }
      : undefined;

    return (
      <PostCard
        post={{
          id: post.uri,
          text: post.record?.text,
          author: {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            verification: post.author.verification,
          },
          createdAt: formatRelativeTime(post.indexedAt),
          likeCount: post.likeCount || 0,
          commentCount: post.replyCount || 0,
          repostCount: post.repostCount || 0,
          embed: post.embed,
          embeds: post.embeds,
          labels: post.labels,
          viewer: post.viewer,
          facets: (post.record as any)?.facets,
          replyTo,
          uri: post.uri,
          cid: post.cid,
          threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
        }}
        href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
        onPress={() => {
          const uriParts = post.uri.split('/');
          const rKey = uriParts[uriParts.length - 1];
          navigateToPost({ actor: post.author.handle, rKey });
        }}
      />
    );
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'profile') {
      return renderProfileResult({ item });
    } else if (item.type === 'post') {
      return renderPostResult({ item });
    }
    return null;
  };

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <ThemedView style={styles.loadingFooter}>
          <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('search.loadingMoreResults')}</ThemedText>
        </ThemedView>
      );
    }
    return null;
  };

  const getEmptyStateText = () => {
    if (!searchQuery) {
      return t('search.searchPlaceholder');
    }

    if (isLoading) {
      return t('search.searching');
    }

    if (isError) {
      return error?.message || t('search.searchFailed');
    }

    switch (activeTab) {
      case 'users':
        return t('search.noUsersFound');
      case 'posts':
        return t('search.noPostsFound');
      default:
        return t('search.noResultsFound');
    }
  };

  const shouldShowTabs = trimmedSearchQuery.length > 0;
  const shouldShowSort = trimmedSearchQuery.length > 0 && activeTab === 'posts';

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
        showTabs={shouldShowTabs}
        sort={sort}
        onSortChange={setSort}
        showSort={shouldShowSort}
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
        showTitle={isLargeScreen}
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
      shouldShowSort,
      sort,
      setActiveTab,
      setQuery,
      shouldShowTabs,
      t,
      textColor,
    ],
  );

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
          isLoading ? (
            <ThemedView style={styles.emptyState}>
              {Array.from({ length: 5 }).map((_, index) => (
                // oxlint-disable-next-line react/no-array-index-key -- placeholder skeletons; fixed-length [0..4] with no identity beyond position
                <SearchResultSkeleton key={`search-skeleton-${index}`} />
              ))}
            </ThemedView>
          ) : (
            <EmptyState
              title={getEmptyStateText()}
              action={
                isError
                  ? { label: t('common.tryAgain'), onPress: () => void refetch() }
                  : undefined
              }
            />
          )
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
  listHeaderContainer: {},
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: layout.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: fontSize.lg,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  resultsListContent: {
    paddingBottom: layout.tabBarPadding,
  },
  resultItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  handle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.xxxxl,
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  sortChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
