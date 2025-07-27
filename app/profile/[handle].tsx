import { router, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();

  const { data: profile, isLoading, error } = useProfile(handle);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !profile) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText style={styles.errorText}>Profile not found</ThemedText>
      </ThemedView>
    );
  }

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
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
      }}
      onPress={() => {
        router.push(`/post/${encodeURIComponent(item.uri)}`);
      }}
    />
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ProfileHeader
        profile={{
          avatar: profile.avatar,
          displayName: profile.displayName,
          handle: profile.handle,
          description: profile.description,
          banner: profile.banner,
        }}
      />

      {/* Posts Section */}
      <ThemedView
        style={[styles.postsSection, { borderBottomColor: borderColor }]}
      >
        <ThemedText style={styles.postsTitle}>Posts</ThemedText>
      </ThemedView>

      {/* Posts List */}
      <FlatList
        data={profile.posts || []}
        renderItem={renderPost}
        keyExtractor={(item) => `${item.uri}-${item.indexedAt}`}
        style={styles.postsList}
        contentContainerStyle={styles.postsListContent}
        ListEmptyComponent={
          <ThemedView style={styles.emptyPosts}>
            <ThemedText style={styles.emptyPostsText}>No posts yet</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  postsList: {
    flex: 1,
  },
  postsListContent: {
    paddingBottom: 100, // Account for tab bar
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
