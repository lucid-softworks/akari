import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton, ProfileHeaderSkeleton } from '@/components/skeletons';
import { useAuthorLikes } from '@/hooks/queries/useAuthorLikes';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type TabType = 'posts' | 'replies' | 'likes' | 'media';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();

  const { data: profile, isLoading, error } = useProfile(handle);
  const { data: posts, isLoading: postsLoading } = useAuthorPosts(activeTab === 'posts' ? handle : undefined);
  const { data: replies, isLoading: repliesLoading } = useAuthorReplies(activeTab === 'replies' ? handle : undefined);
  const { data: likes, isLoading: likesLoading } = useAuthorLikes(activeTab === 'likes' ? handle : undefined);
  const { data: media, isLoading: mediaLoading } = useAuthorMedia(activeTab === 'media' ? handle : undefined);

  if (isLoading) {
    return <ProfileHeaderSkeleton />;
  }

  if (error || !profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{t('common.noProfile')}</ThemedText>
      </ThemedView>
    );
  }

  const isOwnProfile = currentUser?.handle === profile?.handle;

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

  const currentData = getCurrentData();
  const currentLoading = getCurrentLoading();
  const emptyMessage = getEmptyMessage();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={{
            avatar: profile?.avatar,
            displayName: profile?.displayName,
            handle: profile?.handle,
            description: profile?.description,
            banner: profile?.banner,
            did: profile?.did,
            followersCount: profile?.followersCount,
            followsCount: profile?.followsCount,
            postsCount: profile?.postsCount,
            viewer: profile?.viewer,
            labels: profile?.labels,
          }}
          isOwnProfile={isOwnProfile}
        />

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        {currentLoading ? (
          <FeedSkeleton count={3} />
        ) : currentData && currentData.length > 0 ? (
          currentData
            .filter((item) => item && item.uri) // Filter out undefined/null items
            .map((item) => {
              // Check if this post is a reply and has reply context
              const replyTo = item.reply?.parent
                ? {
                    author: {
                      handle: item.reply.parent.author?.handle || 'unknown',
                      displayName: item.reply.parent.author?.displayName,
                    },
                    text: item.reply.parent.record?.text as string | undefined,
                  }
                : undefined;

              return (
                <PostCard
                  key={`${item.uri}-${item.indexedAt}`}
                  post={{
                    id: item.uri,
                    text: item.record?.text as string | undefined,
                    author: {
                      handle: item.author.handle,
                      displayName: item.author.displayName,
                      avatar: item.author.avatar,
                    },
                    createdAt: formatRelativeTime(item.indexedAt),
                    likeCount: item.likeCount || 0,
                    commentCount: item.replyCount || 0,
                    repostCount: item.repostCount || 0,
                    embed: item.embed,
                    embeds: item.embeds,
                    labels: item.labels,
                    viewer: item.viewer,
                    replyTo,
                  }}
                  onPress={() => {
                    router.push(`/post/${encodeURIComponent(item.uri)}`);
                  }}
                />
              );
            })
        ) : (
          <ThemedView style={styles.emptyPosts}>
            <ThemedText style={styles.emptyPostsText}>{emptyMessage}</ThemedText>
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
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: 'red',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPosts: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPostsText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
