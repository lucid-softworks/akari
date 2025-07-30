import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthorLikes } from '@/hooks/queries/useAuthorLikes';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'posts' | 'replies' | 'likes' | 'media';

export default function ProfileScreen() {
  const { data: currentAccount } = useCurrentAccount();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  // Create scroll to top function
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('profile', scrollToTop);
  }, []);

  const { data: profile } = useProfile(currentAccount?.handle);

  const { data: posts, isLoading: postsLoading } = useAuthorPosts(
    activeTab === 'posts' ? currentAccount?.handle : undefined,
  );
  const { data: replies, isLoading: repliesLoading } = useAuthorReplies(
    activeTab === 'replies' ? currentAccount?.handle : undefined,
  );
  const { data: likes, isLoading: likesLoading } = useAuthorLikes(
    activeTab === 'likes' ? currentAccount?.handle : undefined,
  );
  const { data: media, isLoading: mediaLoading } = useAuthorMedia(
    activeTab === 'media' ? currentAccount?.handle : undefined,
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return posts || [];
      case 'replies':
        return replies || [];
      case 'likes':
        return likes || [];
      case 'media':
        return media || [];
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'posts':
        return postsLoading;
      case 'replies':
        return repliesLoading;
      case 'likes':
        return likesLoading;
      case 'media':
        return mediaLoading;
      default:
        return false;
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'posts':
        return t('profile.noPosts');
      case 'replies':
        return t('profile.noReplies');
      case 'likes':
        return t('profile.noLikes');
      case 'media':
        return t('profile.noMedia');
      default:
        return t('profile.noContent');
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Scroll to top when switching tabs
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const currentData = getCurrentData();
  const isLoadingData = getCurrentLoading();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={{
            avatar: profile?.avatar,
            displayName: profile?.displayName || currentAccount?.handle || '',
            handle: currentAccount?.handle || '',
            description: profile?.description,
            banner: profile?.banner,
            did: profile?.did,
            followersCount: profile?.followersCount,
            followsCount: profile?.followsCount,
            postsCount: profile?.postsCount,
            viewer: profile?.viewer,
            labels: profile?.labels,
          }}
          isOwnProfile={true}
        />
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {isLoadingData ? (
          <ThemedView style={styles.loadingState}>
            <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
          </ThemedView>
        ) : currentData.length > 0 ? (
          // Deduplicate posts by URI and create unique keys
          currentData
            .filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri))
            .map((post) => (
              <PostCard
                key={`${post.uri}-${post.indexedAt}`}
                post={{
                  id: post.uri,
                  text: post.record?.text as string | undefined,
                  author: {
                    handle: post.author.handle,
                    displayName: post.author.displayName,
                    avatar: post.author.avatar,
                  },
                  createdAt: new Date(post.indexedAt).toLocaleDateString(),
                  likeCount: post.likeCount || 0,
                  commentCount: post.replyCount || 0,
                  repostCount: post.repostCount || 0,
                  embed: post.embed,
                  embeds: post.embeds,
                  labels: post.labels,
                }}
                onPress={() => {
                  router.push(`/post/${encodeURIComponent(post.uri)}`);
                }}
              />
            ))
        ) : (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>{getEmptyMessage()}</ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Account for tab bar
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
