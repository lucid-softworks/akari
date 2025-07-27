import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTabs } from "@/components/ProfileTabs";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { useAuthorLikes } from "@/hooks/queries/useAuthorLikes";
import { useAuthorMedia } from "@/hooks/queries/useAuthorMedia";
import { useAuthorPosts } from "@/hooks/queries/useAuthorPosts";
import { useAuthorReplies } from "@/hooks/queries/useAuthorReplies";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";
import { jwtStorage } from "@/utils/secureStorage";

type TabType = "posts" | "replies" | "likes" | "media";

export default function ProfileScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const userData = jwtStorage.getUserData();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const [activeTab, setActiveTab] = useState<TabType>("posts");

  const { data: profile } = useProfile(
    userData.handle || "",
    !!userData.handle
  );

  const { data: posts, isLoading: postsLoading } = useAuthorPosts(
    userData.handle || "",
    activeTab === "posts"
  );
  const { data: replies, isLoading: repliesLoading } = useAuthorReplies(
    userData.handle || "",
    activeTab === "replies"
  );
  const { data: likes, isLoading: likesLoading } = useAuthorLikes(
    userData.handle || "",
    activeTab === "likes"
  );
  const { data: media, isLoading: mediaLoading } = useAuthorMedia(
    userData.handle || "",
    activeTab === "media"
  );

  // Handle navigation in useEffect to avoid React warnings
  useEffect(() => {
    if (!isLoading && !authData?.isAuthenticated) {
      router.replace("/(auth)/signin");
    }
  }, [authData?.isAuthenticated, isLoading]);

  // Don't render anything if not authenticated or still loading
  if (isLoading || !authData?.isAuthenticated) {
    return null;
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case "posts":
        return posts || [];
      case "replies":
        return replies || [];
      case "likes":
        return likes || [];
      case "media":
        return media || [];
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "posts":
        return postsLoading;
      case "replies":
        return repliesLoading;
      case "likes":
        return likesLoading;
      case "media":
        return mediaLoading;
      default:
        return false;
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "posts":
        return "No posts yet";
      case "replies":
        return "No replies yet";
      case "likes":
        return "No likes yet";
      case "media":
        return "No media yet";
      default:
        return "No content";
    }
  };

  const currentData = getCurrentData();
  const currentLoading = getCurrentLoading();
  const emptyMessage = getEmptyMessage();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={{
            avatar: profile?.avatar,
            displayName: profile?.displayName || userData.handle || "",
            handle: userData.handle || "",
            description: profile?.description,
            banner: profile?.banner,
            did: profile?.did,
            viewer: profile?.viewer,
          }}
          isOwnProfile={true}
        />

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        {currentLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>
              Loading {activeTab}...
            </ThemedText>
          </ThemedView>
        ) : currentData && currentData.length > 0 ? (
          currentData
            .filter((item) => item && item.uri) // Filter out undefined/null items
            .map((item) => {
              // Check if this post is a reply and has reply context
              const replyTo = item.reply?.parent
                ? {
                    author: {
                      handle: item.reply.parent.author?.handle || "unknown",
                      displayName: item.reply.parent.author?.displayName,
                    },
                    text: item.reply.parent.record?.text || "No text content",
                  }
                : undefined;

              return (
                <PostCard
                  key={`${item.uri}-${item.indexedAt}`}
                  post={{
                    id: item.uri,
                    text: item.record?.text || "No text content",
                    author: {
                      handle: item.author.handle,
                      displayName: item.author.displayName,
                      avatar: item.author.avatar,
                    },
                    createdAt: new Date(item.indexedAt).toLocaleDateString(),
                    likeCount: item.likeCount || 0,
                    commentCount: item.replyCount || 0,
                    repostCount: item.repostCount || 0,
                    embed: item.embed,
                    embeds: item.embeds,
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
            <ThemedText style={styles.emptyPostsText}>
              {emptyMessage}
            </ThemedText>
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyPosts: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyPostsText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
