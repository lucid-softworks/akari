import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";
import { jwtStorage } from "@/utils/secureStorage";

export default function ProfileScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const userData = jwtStorage.getUserData();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();

  const { data: profile } = useProfile(
    userData.handle || "",
    !!userData.handle
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
          }}
        />

        {/* Posts Section */}
        <ThemedView
          style={[styles.postsSection, { borderBottomColor: borderColor }]}
        >
          <ThemedText style={styles.postsTitle}>Your Posts</ThemedText>
        </ThemedView>

        {/* Posts List */}
        {profile?.posts && profile.posts.length > 0 ? (
          profile.posts.map((item: any) => (
            <PostCard
              key={`${item.uri}-${item.indexedAt}`}
              post={{
                id: item.uri,
                text: item.record?.text || "No text content",
                author: {
                  handle: item.author.handle,
                  displayName: item.author.displayName,
                },
                createdAt: new Date(item.indexedAt).toLocaleDateString(),
                likeCount: item.likeCount || 0,
                commentCount: item.replyCount || 0,
                repostCount: item.repostCount || 0,
                embed: item.embed,
              }}
              onPress={() => {
                router.push(`/post/${encodeURIComponent(item.uri)}`);
              }}
            />
          ))
        ) : (
          <ThemedView style={styles.emptyPosts}>
            <ThemedText style={styles.emptyPostsText}>No posts yet</ThemedText>
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
  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: "600",
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
