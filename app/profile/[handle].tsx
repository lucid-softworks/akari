import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTabs } from "@/components/ProfileTabs";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthorLikes } from "@/hooks/queries/useAuthorLikes";
import { useAuthorMedia } from "@/hooks/queries/useAuthorMedia";
import { useAuthorPosts } from "@/hooks/queries/useAuthorPosts";
import { useAuthorReplies } from "@/hooks/queries/useAuthorReplies";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";
import { jwtStorage } from "@/utils/secureStorage";

type TabType = "posts" | "replies" | "likes" | "media";

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const borderColor = useBorderColor();
  const currentUser = jwtStorage.getUserData();

  const { data: profile, isLoading, error } = useProfile(handle);
  const { data: posts, isLoading: postsLoading } = useAuthorPosts(
    handle,
    activeTab === "posts"
  );
  const { data: replies, isLoading: repliesLoading } = useAuthorReplies(
    handle,
    activeTab === "replies"
  );
  const { data: likes, isLoading: likesLoading } = useAuthorLikes(
    handle,
    activeTab === "likes"
  );
  const { data: media, isLoading: mediaLoading } = useAuthorMedia(
    handle,
    activeTab === "media"
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>Profile not found</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.handle === profile?.handle;

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
    <SafeAreaView style={styles.container}>
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
              viewer: profile?.viewer,
              labels: profile?.labels,
            }}
            isOwnProfile={isOwnProfile}
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
                      labels: item.labels,
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
    </SafeAreaView>
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
    textAlign: "center",
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    color: "red",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
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
