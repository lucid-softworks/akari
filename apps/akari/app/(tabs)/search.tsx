import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Labels } from '@/components/Labels';

import { PostCard } from '@/components/PostCard';
import { SearchTabs } from '@/components/SearchTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SearchResultSkeleton } from '@/components/skeletons';
import { useSearch } from '@/hooks/queries/useSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

type SearchResult = {
  type: 'profile' | 'post';
  data: any;
};

type SearchTabType = 'all' | 'users' | 'posts';

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(initialQuery || '');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState<SearchTabType>('all');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Create scroll to top function
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('search', scrollToTop);
  }, []);

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
  } = useSearch(searchQuery.trim() || undefined, 'all', 20);

  // Flatten all search results from all pages
  const allResults = searchData?.pages.flatMap((page) => page.results) || [];

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

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      Keyboard.dismiss();
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
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
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => router.push('/profile/' + encodeURIComponent(profile.handle))}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.profileContainer}>
          {profile.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              style={styles.profileAvatar}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
          ) : null}
          <ThemedView style={styles.profileInfo}>
            <ThemedText style={styles.displayName}>{profile.displayName || profile.handle}</ThemedText>
            <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
            {profile.description ? (
              <ThemedText style={styles.description} numberOfLines={2}>
                {profile.description}
              </ThemedText>
            ) : null}
            <Labels labels={profile.labels} maxLabels={3} />
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
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
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
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
        }}
        onPress={() => {
          router.push('/post/' + encodeURIComponent(post.uri));
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
          <ThemedText style={styles.loadingText}>{t('search.loadingMoreResults')}</ThemedText>
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

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>{t('navigation.search')}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.searchInputPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, isLoading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isLoading}
        >
          <ThemedText style={styles.searchButtonText}>{isLoading ? t('search.searching') : t('common.search')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {searchQuery && allResults.length > 0 ? <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} /> : null}

      <FlatList
        ref={flatListRef}
        data={filteredResults}
        renderItem={renderResult}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        style={styles.resultsList}
        contentContainerStyle={styles.resultsListContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          isLoading ? (
            <ThemedView style={styles.emptyState}>
              {Array.from({ length: 5 }).map((_, index) => (
                <SearchResultSkeleton key={index} />
              ))}
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{getEmptyStateText()}</ThemedText>
            </ThemedView>
          )
        }
      />
    </ThemedView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderMuted,
    },
    searchInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.border,
      color: colors.text,
    },
    searchButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.accent,
    },
    searchButtonDisabled: {
      opacity: 0.7,
    },
    searchButtonText: {
      color: colors.inverseText,
      fontSize: 16,
      fontWeight: '600',
    },
    resultsList: {
      flex: 1,
    },
    resultsListContent: {
      paddingBottom: 100,
      backgroundColor: colors.background,
    },
    resultItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderMuted,
      backgroundColor: colors.surface,
    },
    profileContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    profileAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    profileInfo: {
      flex: 1,
      gap: 4,
    },
    displayName: {
      fontSize: 16,
      fontWeight: '600',
    },
    handle: {
      fontSize: 14,
      opacity: 0.7,
    },
    description: {
      fontSize: 14,
      lineHeight: 18,
      marginTop: 4,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    emptyStateText: {
      fontSize: 16,
      opacity: 0.6,
    },
    loadingFooter: {
      paddingVertical: 20,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    loadingText: {
      fontSize: 14,
      opacity: 0.6,
    },
  });
}
