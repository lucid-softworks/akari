import { useResponsive } from '@/hooks/useResponsive';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { TabBar } from '@/components/TabBar';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons/FeedSkeleton';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeed } from '@/hooks/queries/useFeed';
import { usePreferences, useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { isLargeScreen } = useResponsive();
  const { navigateToPost } = useTabNavigation();
  const { data: preferences } = usePreferences();
  const { data: selectedFeed } = useSelectedFeed();
  const { data: feeds } = useSavedFeeds();
  const setSelectedFeed = useSetSelectedFeed();
  const { data: currentAccount } = useCurrentAccount();

  // Use the selected feed
  const { data: feedData, isLoading: isFeedLoading } = useFeed(selectedFeed || null);

  // Handle different data structures
  const feedItems = (feedData as any)?.pages?.flatMap((page: any) => page.feed) || [];

  const handleLoadMore = () => {
    // For now, we'll implement pagination later
    // Timeline and feed data don't have infinite scroll yet
  };

  const renderPost = ({ item }: { item: any }) => {
    const replyTo = item.reply ? item.reply.parent : null;
    return (
      <PostCard
        key={item.post.uri}
        post={{
          id: item.post.uri,
          text: item.post.record.text,
          author: item.post.author,
          createdAt: item.post.record.createdAt,
          likeCount: item.post.likeCount,
          commentCount: item.post.replyCount,
          repostCount: item.post.repostCount,
          embed: item.post.embed,
          embeds: item.post.embeds,
          replyTo,
          labels: item.post.labels,
          viewer: item.post.viewer,
          facets: item.post.record.facets,
          uri: item.post.uri,
          cid: item.post.cid,
        }}
        onPress={() => {
          navigateToPost(item.post.uri, item.post.author.handle);
        }}
      />
    );
  };

  const renderFooter = () => {
    // For now, no footer loading state
    return null;
  };

  const feedTabs = [
    ...(feeds
      ?.filter((feed) => feed.type === 'feed')
      .map((feed) => ({
        key: feed.value,
        label: feed.metadata?.displayName || 'Unknown Feed',
      })) || []),
  ];

  const handleFeedChange = (feedKey: string) => {
    setSelectedFeed.mutate(feedKey);
  };

  if (isFeedLoading) {
    return <FeedSkeleton />;
  }

  return (
    <ThemedView style={styles.container}>
      <TabBar tabs={feedTabs} activeTab={selectedFeed || ''} onTabChange={handleFeedChange} />
      <VirtualizedList
        data={feedItems}
        renderItem={renderPost}
        keyExtractor={(item) => item.post.uri}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        estimatedItemSize={320}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
