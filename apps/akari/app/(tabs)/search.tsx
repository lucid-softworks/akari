import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Labels } from '@/components/Labels';

import { PostCard } from '@/components/PostCard';
import { SearchTabs } from '@/components/SearchTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SearchResultSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Panel } from '@/components/ui/Panel';
import { ThemedFeatureCard } from '@/components/ThemedFeatureCard';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useSearch } from '@/hooks/queries/useSearch';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyFeed, BlueskyTrendingTopic } from '@/bluesky-api';
import { extractFeedUriFromLink, resolveBskyLink } from '@/utils/feedLinks';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

type SearchResult = {
  type: 'profile' | 'post';
  data: any;
};

type SearchTabType = 'all' | 'users' | 'posts';

type DiscoverableFeed = {
  topic: BlueskyTrendingTopic;
  feedUri?: string;
  feed?: BlueskyFeed;
};

type QuickAction = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  onPress: () => void;
};

export default function SearchScreen() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(initialQuery || '');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState<SearchTabType>('all');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<SearchResult>>(null);
  const { t } = useTranslation();
  const { isLargeScreen } = useResponsive();
  const setSelectedFeedMutation = useSetSelectedFeed();

  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = usePreferences();

  const {
    data: trendingData,
    isLoading: trendingLoading,
    error: trendingError,
  } = useTrendingTopics(12);

  const accentColor = useThemeColor(
    {
      light: '#7C8CF9',
      dark: '#7C8CF9',
    },
    'tint',
  );

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

  const secondaryTextColor = useThemeColor(
    {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
    'text',
  );

  const quickActionCardColor = useThemeColor(
    {
      light: '#F5F6FF',
      dark: '#141827',
    },
    'background',
  );

  const quickActionIconBackground = useThemeColor(
    {
      light: '#E1E6FF',
      dark: '#232840',
    },
    'background',
  );

  const chipBackgroundColor = useThemeColor(
    {
      light: '#EEF2FF',
      dark: '#1C2335',
    },
    'background',
  );

  const chipBorderColor = useThemeColor(
    {
      light: '#D5DBFF',
      dark: '#2A3149',
    },
    'border',
  );

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  const discoverableFeedsInfo = useMemo(() => {
    return (trendingData?.suggested ?? []).map((topic) => ({
      topic,
      feedUri: extractFeedUriFromLink(topic.link),
    }));
  }, [trendingData?.suggested]);

  const feedUris = useMemo(
    () =>
      discoverableFeedsInfo
        .map((item) => item.feedUri)
        .filter((value): value is string => !!value),
    [discoverableFeedsInfo],
  );

  const { data: feedGeneratorsData, isLoading: feedGeneratorsLoading } = useFeedGenerators(feedUris);

  const feedMetadataMap = useMemo(() => {
    const map = new Map<string, BlueskyFeed>();
    feedGeneratorsData?.feeds.forEach((feed) => {
      map.set(feed.uri, feed);
    });
    return map;
  }, [feedGeneratorsData]);

  const discoverableFeeds = useMemo<DiscoverableFeed[]>(() => {
    if (discoverableFeedsInfo.length === 0) {
      return [];
    }

    return discoverableFeedsInfo.map((item) => ({
      topic: item.topic,
      feedUri: item.feedUri,
      feed: item.feedUri ? feedMetadataMap.get(item.feedUri) : undefined,
    }));
  }, [discoverableFeedsInfo, feedMetadataMap]);

  const interestTags = useMemo(() => {
    const interestsPref = preferencesData?.preferences.find(
      (pref): pref is { $type: 'app.bsky.actor.defs#interestsPref'; tags: string[] } =>
        pref.$type === 'app.bsky.actor.defs#interestsPref',
    );

    return interestsPref?.tags ?? [];
  }, [preferencesData]);

  const trendingTopics = trendingData?.topics ?? [];

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleResetSearch = useCallback(() => {
    setQuery('');
    setSearchQuery('');
    setActiveTab('all');
    scrollToTop();
    Keyboard.dismiss();
  }, [scrollToTop]);

  useEffect(() => {
    tabScrollRegistry.register('search', handleResetSearch);
  }, [handleResetSearch]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const performQuickSearch = useCallback(
    (value: string) => {
      if (!value) return;

      setQuery(value);
      setSearchQuery(value);
      setActiveTab('all');
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleTabChange = useCallback(
    (tab: SearchTabType) => {
      setActiveTab(tab);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      setActiveTab('all');
      scrollToTop();
      Keyboard.dismiss();
    }
  }, [query, scrollToTop]);

  const handleInterestPress = useCallback(
    (interest: string) => {
      performQuickSearch(interest);
    },
    [performQuickSearch],
  );

  const handleTrendingTopicPress = useCallback(
    (topic: string) => {
      performQuickSearch(topic);
    },
    [performQuickSearch],
  );

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
  } = useSearch(searchQuery.trim() || undefined, activeTab, 20);

  const handleOpenFeed = useCallback(
    (feedUri?: string, fallbackLink?: string) => {
      if (feedUri) {
        setSelectedFeedMutation.mutate(feedUri);
        router.push('/(tabs)');
        return;
      }

      if (fallbackLink) {
        Linking.openURL(resolveBskyLink(fallbackLink)).catch((linkError) => {
          console.warn('Failed to open feed link', linkError);
        });
      }
    },
    [setSelectedFeedMutation],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRefresh = useCallback(async () => {
    if (searchQuery.trim()) {
      await refetch();
    }
  }, [refetch, searchQuery]);

  const allResults = searchData?.pages.flatMap((page) => page.results) || [];

  const hasSearchContent = query.length > 0 || searchQuery.length > 0;

  const filteredResults = useMemo(() => {
    switch (activeTab) {
      case 'users':
        return allResults.filter((result) => result.type === 'profile');
      case 'posts':
        return allResults.filter((result) => result.type === 'post');
      default:
        return allResults;
    }
  }, [activeTab, allResults]);


  const handleEditInterests = useCallback(() => {
    router.push('/(tabs)/settings');
  }, []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: 'whatsHot',
        title: t('search.quickAction.whatsHot'),
        description: t('search.quickAction.whatsHotDescription'),
        icon: 'flame.fill',
        onPress: () =>
          handleOpenFeed(
            'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
            '/profile/bsky.app/feed/whats-hot',
          ),
      },
      {
        key: 'discoverFeeds',
        title: t('search.quickAction.discoverFeeds'),
        description: t('search.quickAction.discoverFeedsDescription'),
        icon: 'sparkles',
        onPress: () => {
          if (discoverableFeeds.length > 0) {
            const [first] = discoverableFeeds;
            handleOpenFeed(first.feedUri, first.topic.link);
          } else {
            handleOpenFeed(undefined, '/discover');
          }
        },
      },
      {
        key: 'editInterests',
        title: t('search.quickAction.editInterests'),
        description: t('search.quickAction.editInterestsDescription'),
        icon: 'slider.horizontal.3',
        onPress: handleEditInterests,
      },
    ],
    [discoverableFeeds, handleEditInterests, handleOpenFeed, t],
  );

  const quickActionsPanel = useMemo(() => {
    if (quickActions.length === 0) {
      return null;
    }

    return (
      <Panel title={t('search.quickActions')} contentStyle={styles.quickActionsContent}>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: quickActionCardColor,
                  borderColor,
                },
              ]}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: quickActionIconBackground }]}
              >
                <IconSymbol name={action.icon} color={accentColor} size={20} />
              </View>
              <View style={styles.quickActionContent}>
                <ThemedText style={[styles.quickActionTitle, { color: textColor }]}>
                  {action.title}
                </ThemedText>
                <ThemedText
                  style={[styles.quickActionDescription, { color: secondaryTextColor }]}
                >
                  {action.description}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>
    );
  }, [
    accentColor,
    borderColor,
    quickActionCardColor,
    quickActionIconBackground,
    quickActions,
    secondaryTextColor,
    t,
    textColor,
  ]);

  const interestsPanel = useMemo(() => {
    const headerActions = (
      <TouchableOpacity onPress={handleEditInterests} accessibilityRole="button">
        <ThemedText style={[styles.headerActionText, { color: accentColor }]}>
          {t('search.editInterests')}
        </ThemedText>
      </TouchableOpacity>
    );

    if (preferencesLoading) {
      return (
        <Panel title={t('search.yourInterests')} headerActions={headerActions}>
          <ThemedText style={[styles.panelSubtleText, { color: secondaryTextColor }]}>
            {t('common.loading')}
          </ThemedText>
        </Panel>
      );
    }

    if (preferencesError) {
      const message =
        preferencesError instanceof Error ? preferencesError.message : t('search.searchFailed');

      return (
        <Panel title={t('search.yourInterests')} headerActions={headerActions}>
          <ThemedText style={styles.panelErrorText}>{message}</ThemedText>
        </Panel>
      );
    }

    if (interestTags.length === 0) {
      return (
        <Panel title={t('search.yourInterests')} headerActions={headerActions}>
          <ThemedText style={[styles.panelSubtleText, { color: secondaryTextColor }]}>
            {t('search.noInterests')}
          </ThemedText>
        </Panel>
      );
    }

    return (
      <Panel
        title={t('search.yourInterests')}
        headerActions={headerActions}
        contentStyle={styles.panelContentSpacing}
      >
        <View style={styles.tagGrid}>
          {interestTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagChip,
                {
                  backgroundColor: chipBackgroundColor,
                  borderColor: chipBorderColor,
                },
              ]}
              onPress={() => handleInterestPress(tag)}
              accessibilityRole="button"
              accessibilityLabel={t('search.searchTopic')}
            >
              <ThemedText style={[styles.tagChipText, { color: accentColor }]}>
                {tag}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>
    );
  }, [
    accentColor,
    chipBackgroundColor,
    chipBorderColor,
    handleEditInterests,
    handleInterestPress,
    interestTags,
    preferencesError,
    preferencesLoading,
    secondaryTextColor,
    t,
  ]);

  const trendingPanel = useMemo(() => {
    if (trendingLoading) {
      return (
        <Panel title={t('search.trendingTopics')}>
          <ThemedText style={[styles.panelSubtleText, { color: secondaryTextColor }]}>
            {t('search.loadingTrendingTopics')}
          </ThemedText>
        </Panel>
      );
    }

    if (trendingError) {
      const message = trendingError instanceof Error ? trendingError.message : t('search.searchFailed');
      return (
        <Panel title={t('search.trendingTopics')}>
          <ThemedText style={styles.panelErrorText}>{message}</ThemedText>
        </Panel>
      );
    }

    if (trendingTopics.length === 0) {
      return (
        <Panel title={t('search.trendingTopics')}>
          <ThemedText style={[styles.panelSubtleText, { color: secondaryTextColor }]}>
            {t('search.noTrendingTopics')}
          </ThemedText>
        </Panel>
      );
    }

    return (
      <Panel title={t('search.trendingTopics')} contentStyle={styles.panelContentSpacing}>
        <View style={styles.tagGrid}>
          {trendingTopics.map((topic, index) => (
            <TouchableOpacity
              key={`${topic.topic}-${index}`}
              style={[
                styles.tagChip,
                {
                  backgroundColor: chipBackgroundColor,
                  borderColor: chipBorderColor,
                },
              ]}
              onPress={() => handleTrendingTopicPress(topic.topic)}
              accessibilityRole="button"
              accessibilityLabel={t('search.searchTopic')}
            >
              <ThemedText style={[styles.tagChipText, { color: accentColor }]}>
                {topic.topic}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>
    );
  }, [
    accentColor,
    chipBackgroundColor,
    chipBorderColor,
    handleTrendingTopicPress,
    secondaryTextColor,
    t,
    trendingError,
    trendingLoading,
    trendingTopics,
  ]);

  const discoverFeedsPanel = useMemo(() => {
    if (feedGeneratorsLoading && discoverableFeeds.length === 0) {
      return (
        <Panel title={t('search.discoverFeeds')}>
          <ThemedText style={[styles.panelSubtleText, { color: secondaryTextColor }]}>
            {t('common.loading')}
          </ThemedText>
        </Panel>
      );
    }

    if (discoverableFeeds.length === 0) {
      return null;
    }

    return (
      <Panel title={t('search.discoverFeeds')} contentStyle={styles.panelContentSpacing}>
        <View style={styles.feedList}>
          {discoverableFeeds.map(({ topic, feedUri, feed }) => {
            const key = feedUri ?? topic.link ?? topic.topic;
            const displayName = feed?.displayName ?? topic.topic;
            const creator = feed?.creator;
            const creatorLabel = creator
              ? creator.displayName || (creator.handle ? `@${creator.handle}` : undefined)
              : undefined;
            const fallbackInitial = displayName.charAt(0).toUpperCase();

            return (
              <ThemedFeatureCard
                key={key}
                style={[styles.feedCard, { borderColor }]}
                lightColor="#F9FAFF"
                darkColor="#161B2E"
              >
                {feed?.avatar ? (
                  <Image
                    source={{ uri: feed.avatar }}
                    style={styles.feedAvatarLarge}
                    contentFit="cover"
                    placeholder={require('@/assets/images/partial-react-logo.png')}
                  />
                ) : (
                  <View
                    style={[
                      styles.feedAvatarFallback,
                      { backgroundColor: quickActionIconBackground },
                    ]}
                  >
                    <ThemedText style={[styles.feedAvatarFallbackText, { color: accentColor }]}>
                      {fallbackInitial}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.feedCardInfo}>
                  <ThemedText style={[styles.feedTitle, { color: textColor }]} numberOfLines={1}>
                    {displayName}
                  </ThemedText>
                  {creatorLabel ? (
                    <ThemedText
                      style={[styles.feedSubtitle, { color: secondaryTextColor }]}
                      numberOfLines={1}
                    >
                      {t('search.feedByCreator', { author: creatorLabel })}
                    </ThemedText>
                  ) : null}
                  {feed?.description ? (
                    <ThemedText
                      style={[styles.feedDescription, { color: secondaryTextColor }]}
                      numberOfLines={2}
                    >
                      {feed.description}
                    </ThemedText>
                  ) : null}
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.feedActionButton, { backgroundColor: accentColor }]}
                    onPress={() => handleOpenFeed(feedUri, topic.link)}
                  >
                    <ThemedText style={styles.feedActionButtonText}>
                      {t('search.openFeed')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedFeatureCard>
            );
          })}
        </View>
      </Panel>
    );
  }, [
    accentColor,
    borderColor,
    discoverableFeeds,
    feedGeneratorsLoading,
    handleOpenFeed,
    quickActionIconBackground,
    secondaryTextColor,
    t,
    textColor,
  ]);

  const exploreSections = useMemo(() => {
    const sections: Array<{ key: string; node: React.ReactNode }> = [];

    if (quickActionsPanel) {
      sections.push({ key: 'quick-actions', node: quickActionsPanel });
    }

    if (interestsPanel) {
      sections.push({ key: 'interests', node: interestsPanel });
    }

    if (trendingPanel) {
      sections.push({ key: 'trending', node: trendingPanel });
    }

    if (discoverFeedsPanel) {
      sections.push({ key: 'feeds', node: discoverFeedsPanel });
    }

    return sections;
  }, [discoverFeedsPanel, interestsPanel, quickActionsPanel, trendingPanel]);
  const renderExploreContent = useCallback(() => {
    if (exploreSections.length === 0) {
      return null;
    }

    return (
      <View style={styles.exploreSections}>
        {exploreSections.map((section, index) => (
          <View key={section.key} style={index > 0 ? styles.sectionSpacing : undefined}>
            {section.node}
          </View>
        ))}
      </View>
    );
  }, [exploreSections]);

  const renderLoadMoreFooter = useCallback(() => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={[styles.loadingText, { color: secondaryTextColor }]}>
          {t('search.loadingMoreResults')}
        </ThemedText>
      </ThemedView>
    );
  }, [isFetchingNextPage, secondaryTextColor, t]);

  const renderListFooter = useCallback(() => {
    const loadMoreFooter = renderLoadMoreFooter();
    const exploreContent = !isLargeScreen ? renderExploreContent() : null;

    if (!loadMoreFooter && !exploreContent) {
      return null;
    }

    return (
      <View style={styles.listFooter}>
        {loadMoreFooter}
        {exploreContent}
      </View>
    );
  }, [isLargeScreen, renderExploreContent, renderLoadMoreFooter]);

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
            <ThemedText style={[styles.handle, { color: textColor }]}>
              @{profile.handle}
            </ThemedText>
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
    }

    if (item.type === 'post') {
      return renderPostResult({ item });
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
      <ThemedView
        style={[
          styles.contentWrapper,
          isLargeScreen ? styles.contentWrapperLarge : undefined,
        ]}
      >
        <ThemedView
          style={[
            styles.mainColumn,
            isLargeScreen ? styles.mainColumnLarge : undefined,
          ]}
        >
          <ThemedView style={styles.header}>
            <ThemedText style={[styles.title, { color: textColor }]}>
              {t('navigation.search')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
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
              {hasSearchContent ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleResetSearch}
                  accessibilityRole="button"
                  accessibilityLabel={t('search.clearSearch')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol name="xmark.circle.fill" color={secondaryTextColor} size={20} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: accentColor }]}
              onPress={handleSearch}
              disabled={isLoading}
            >
              <ThemedText style={styles.searchButtonText}>
                {isLoading ? t('search.searching') : t('common.search')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {searchQuery ? (
            <SearchTabs activeTab={activeTab} onTabChange={handleTabChange} />
          ) : null}

          <FlatList
            ref={flatListRef}
            data={filteredResults}
            renderItem={renderResult}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            style={styles.resultsList}
            contentContainerStyle={styles.resultsListContent}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={
              isLoading ? (
                <ThemedView style={styles.emptyState}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <SearchResultSkeleton key={index} />
                  ))}
                </ThemedView>
              ) : (
                <ThemedView style={styles.emptyState}>
                  <ThemedText style={[styles.emptyStateText, { color: textColor }]}>
                    {getEmptyStateText()}
                  </ThemedText>
                </ThemedView>
              )
            }
          />
        </ThemedView>

        {isLargeScreen ? (
          <ScrollView
            style={styles.sidebar}
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
            {renderExploreContent()}
          </ScrollView>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  contentWrapperLarge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1,
  },
  mainColumnLarge: {
    paddingRight: 24,
  },
  sidebar: {
    width: 320,
  },
  sidebarContent: {
    paddingBottom: 120,
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
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingRight: 40,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 120,
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
  listFooter: {
    paddingBottom: 80,
  },
  exploreSections: {
    width: '100%',
  },
  sectionSpacing: {
    marginTop: 16,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  panelSubtleText: {
    fontSize: 14,
  },
  panelErrorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  quickActionsContent: {
    gap: 16,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: 4,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  panelContentSpacing: {
    gap: 12,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedList: {
    width: '100%',
    gap: 16,
  },
  feedCard: {
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  feedCardInfo: {
    flex: 1,
    gap: 8,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedSubtitle: {
    fontSize: 14,
  },
  feedDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  feedActionButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  feedActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
});
