import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Labels } from '@/components/Labels';

import { PostCard } from '@/components/PostCard';
import { SearchTabs } from '@/components/SearchTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SearchResultSkeleton } from '@/components/skeletons';
import type { BlueskyFeed, BlueskyTrendingTopic } from '@/bluesky-api';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { useSearch } from '@/hooks/queries/useSearch';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

type SearchResult = {
  type: 'profile' | 'post';
  data: any;
};

type SearchTabType = 'all' | 'users' | 'posts';

const FEED_LINK_REGEX = /profile\/([^/]+)\/feed\/([^/?#]+)/i;

function extractFeedUriFromLink(link: string): string | null {
  if (!link) {
    return null;
  }

  if (link.startsWith('at://')) {
    return link;
  }

  const match = link.match(FEED_LINK_REGEX);

  if (!match) {
    return null;
  }

  const [, didSegment, feedSegment] = match;

  if (!didSegment || !feedSegment) {
    return null;
  }

  const decodedDid = decodeURIComponent(didSegment);
  const decodedFeed = decodeURIComponent(feedSegment);

  return `at://${decodedDid}/app.bsky.feed.generator/${decodedFeed}`;
}

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(initialQuery || '');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState<SearchTabType>('all');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { t } = useTranslation();
  const setSelectedFeedMutation = useSetSelectedFeed();

  // Create scroll to top function
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('search', scrollToTop);
  }, []);

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

  const mutedTextColor = useThemeColor(
    {
      light: '#6b7280',
      dark: '#9ba1a6',
    },
    'text',
  );

  const cardSurfaceColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#101216',
    },
    'background',
  );

  const accentColor = useThemeColor(
    {
      light: '#f97316',
      dark: '#fb923c',
    },
    'tint',
  );

  const rankBackgroundColor = useThemeColor(
    {
      light: '#f3f4f6',
      dark: '#1f2937',
    },
    'background',
  );

  const avatarPlaceholderColor = useThemeColor(
    {
      light: '#e5e7eb',
      dark: '#1f2937',
    },
    'background',
  );

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

  const showDiscoverContent = searchQuery.trim().length === 0;

  const {
    data: trendingData,
    isLoading: isTrendingLoading,
    error: trendingError,
    refetch: refetchTrending,
    isRefetching: isTrendingRefetching,
  } = useTrendingTopics(10, { enabled: showDiscoverContent });

  const interests = useMemo<BlueskyTrendingTopic[]>(() => {
    if (!showDiscoverContent || !trendingData?.topics) {
      return [];
    }

    return trendingData.topics.slice(0, 5);
  }, [showDiscoverContent, trendingData?.topics]);

  const suggestedFeedUris = useMemo(() => {
    if (!showDiscoverContent || !trendingData?.suggested) {
      return [] as string[];
    }

    const uniqueUris = new Set<string>();

    trendingData.suggested.forEach((item) => {
      const feedUri = extractFeedUriFromLink(item.link);

      if (feedUri) {
        uniqueUris.add(feedUri);
      }
    });

    return Array.from(uniqueUris);
  }, [showDiscoverContent, trendingData?.suggested]);

  const {
    data: suggestedFeedsData,
    isLoading: isSuggestedFeedsLoading,
  } = useFeedGenerators(suggestedFeedUris);

  const suggestedFeeds = useMemo<Array<{ topic: string; feedUri: string; feed?: BlueskyFeed }>>(() => {
    if (!showDiscoverContent || !trendingData?.suggested) {
      return [];
    }

    const feedMap = new Map<string, BlueskyFeed>();
    suggestedFeedsData?.feeds.forEach((feed) => {
      feedMap.set(feed.uri, feed);
    });

    return trendingData.suggested
      .map((item) => {
        const feedUri = extractFeedUriFromLink(item.link);

        if (!feedUri) {
          return null;
        }

        return {
          topic: item.topic,
          feedUri,
          feed: feedMap.get(feedUri),
        };
      })
      .filter((item): item is { topic: string; feedUri: string; feed?: BlueskyFeed } => item !== null)
      .slice(0, 5);
  }, [showDiscoverContent, suggestedFeedsData?.feeds, trendingData?.suggested]);

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
    } else {
      await refetchTrending();
    }
  };

  const handleInterestPress = (topic: string) => {
    const trimmedTopic = topic.trim();

    if (!trimmedTopic) {
      return;
    }

    setQuery(trimmedTopic);
    setSearchQuery(trimmedTopic);
    Keyboard.dismiss();
    scrollToTop();
  };

  const handleFeedPress = (feedUri: string) => {
    if (!feedUri) {
      return;
    }

    setSelectedFeedMutation.mutate(feedUri);
    router.push('/(tabs)');
  };

  const discoverContent = (() => {
    if (!showDiscoverContent) {
      return null;
    }

    if (isTrendingLoading) {
      return (
        <ThemedView style={styles.discoverContainer}>
          <ThemedView style={[styles.sectionCard, { borderColor, backgroundColor: cardSurfaceColor }]}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('search.yourInterests')}</ThemedText>
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>{t('common.loading')}</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.sectionCard, { borderColor, backgroundColor: cardSurfaceColor }]}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('search.discoverNewFeeds')}</ThemedText>
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>{t('common.loading')}</ThemedText>
          </ThemedView>
        </ThemedView>
      );
    }

    const hasTrendingError = Boolean(trendingError);

    return (
      <ThemedView style={styles.discoverContainer}>
        <ThemedView style={[styles.sectionCard, { borderColor, backgroundColor: cardSurfaceColor }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('search.yourInterests')}</ThemedText>
              <ThemedText style={[styles.sectionDescription, { color: mutedTextColor }]}>
                {t('search.interestsDescription')}
              </ThemedText>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/settings')}
              style={[styles.sectionAction, { borderColor }]}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.sectionActionText, { color: textColor }]}>
                {t('search.editInterests')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {hasTrendingError ? (
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>
              {t('search.unableToLoadSuggestions')}
            </ThemedText>
          ) : interests.length > 0 ? (
            <View style={styles.interestList}>
              {interests.map((topic, index) => (
                <TouchableOpacity
                  key={`${topic.link}-${index}`}
                  accessibilityRole="button"
                  onPress={() => handleInterestPress(topic.topic)}
                  style={[
                    styles.interestItem,
                    { borderTopColor: borderColor },
                    index === 0 ? styles.interestItemFirst : null,
                  ]}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.interestRank,
                      {
                        borderColor: index === 0 ? accentColor : borderColor,
                        backgroundColor: index === 0 ? accentColor : rankBackgroundColor,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.interestRankText,
                        index === 0 ? styles.interestRankTextHot : null,
                      ]}
                    >
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.interestContent}>
                    <View style={styles.interestHotRow}>
                      <ThemedText style={[styles.interestTopic, { color: textColor }]} numberOfLines={1}>
                        {topic.topic}
                      </ThemedText>
                      {index === 0 ? (
                        <View style={[styles.hotBadge, { backgroundColor: accentColor }]}>
                          <ThemedText style={styles.hotBadgeText}>{t('search.hotLabel')}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>
              {t('search.noInterestsAvailable')}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={[styles.sectionCard, { borderColor, backgroundColor: cardSurfaceColor }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t('search.discoverNewFeeds')}
          </ThemedText>

          {hasTrendingError ? (
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>
              {t('search.unableToLoadSuggestions')}
            </ThemedText>
          ) : isSuggestedFeedsLoading ? (
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>
              {t('common.loading')}
            </ThemedText>
          ) : suggestedFeeds.length > 0 ? (
            <View style={styles.feedsList}>
              {suggestedFeeds.map(({ feedUri, feed, topic }, index) => {
                const displayName = feed?.displayName || topic;
                const handle = feed?.creator?.handle ? `@${feed.creator.handle}` : undefined;
                const initials = displayName?.charAt(0)?.toUpperCase() ?? '#';

                return (
                  <View
                    key={feedUri}
                    style={[
                      styles.feedRow,
                      { borderTopColor: borderColor },
                      index === 0 ? styles.feedRowFirst : null,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.feedInfo}
                      onPress={() => handleFeedPress(feedUri)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      {feed?.avatar ? (
                        <Image source={{ uri: feed.avatar }} style={styles.feedAvatar} contentFit="cover" />
                      ) : (
                        <View
                          style={[
                            styles.feedAvatarPlaceholder,
                            { backgroundColor: avatarPlaceholderColor },
                          ]}
                        >
                          <ThemedText style={[styles.feedAvatarText, { color: textColor }]}>
                            {initials}
                          </ThemedText>
                        </View>
                      )}
                      <View style={styles.feedDetails}>
                        <ThemedText style={[styles.feedTitle, { color: textColor }]} numberOfLines={1}>
                          {displayName}
                        </ThemedText>
                        {handle ? (
                          <ThemedText style={[styles.feedCreator, { color: mutedTextColor }]} numberOfLines={1}>
                            {handle}
                          </ThemedText>
                        ) : null}
                        {feed?.description ? (
                          <ThemedText style={[styles.feedDescription, { color: mutedTextColor }]} numberOfLines={2}>
                            {feed.description}
                          </ThemedText>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleFeedPress(feedUri)}
                      style={[styles.feedActionButton, { borderColor }]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <ThemedText style={[styles.feedActionText, { color: textColor }]}>
                        {t('search.viewFeed')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <ThemedText style={[styles.sectionPlaceholder, { color: mutedTextColor }]}>
              {t('search.noSuggestedFeeds')}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    );
  })();

  const renderProfileResult = ({ item }: { item: SearchResult }) => {
    if (item.type !== 'profile') return null;

    const profile = item.data;
    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: borderColor }]}
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
            <ThemedText style={[styles.displayName, { color: textColor }]}>
              {profile.displayName || profile.handle}
            </ThemedText>
            <ThemedText style={[styles.handle, { color: textColor }]}>@{profile.handle}</ThemedText>
            {profile.description ? (
              <ThemedText style={[styles.description, { color: textColor }]} numberOfLines={2}>
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

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>{t('navigation.search')}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: backgroundColor,
              borderColor: borderColor,
              color: textColor,
            },
          ]}
          placeholder={t('search.searchInputPlaceholder')}
          placeholderTextColor="#999999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: borderColor }]}
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
          <RefreshControl
            refreshing={showDiscoverContent ? isTrendingRefetching : isRefetching}
            onRefresh={handleRefresh}
          />
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
          ) : showDiscoverContent ? (
            discoverContent
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={[styles.emptyStateText, { color: textColor }]}>{getEmptyStateText()}</ThemedText>
            </ThemedView>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  discoverContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  sectionAction: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionPlaceholder: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.75,
  },
  interestList: {
    gap: 12,
  },
  interestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  interestItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  interestRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  interestRankText: {
    fontWeight: '600',
  },
  interestRankTextHot: {
    color: '#ffffff',
  },
  interestContent: {
    flex: 1,
  },
  interestHotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interestTopic: {
    fontSize: 16,
    fontWeight: '600',
  },
  hotBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hotBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  feedsList: {
    gap: 16,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  feedRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  feedInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  feedAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  feedDetails: {
    flex: 1,
    gap: 4,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedCreator: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  feedDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  feedActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  feedActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
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
  },
  emptyStateText: {
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
});
