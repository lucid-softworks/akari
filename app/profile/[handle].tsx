import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useProfile } from "@/hooks/queries/useProfile";
import { useBorderColor } from "@/hooks/useBorderColor";
import { jwtStorage } from "@/utils/secureStorage";

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const borderColor = useBorderColor();
  const currentUser = jwtStorage.getUserData();

  const { data: profile, isLoading, error } = useProfile(handle);

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

  // For debugging - you can temporarily set this to true to test
  // const isOwnProfile = true;

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
            }}
            isOwnProfile={isOwnProfile}
          />

          {/* Posts Section */}
          <ThemedView
            style={[styles.postsSection, { borderBottomColor: borderColor }]}
          >
            <ThemedText style={styles.postsTitle}>Posts</ThemedText>
          </ThemedView>

          {/* Posts List */}
          {profile?.posts && profile.posts.length > 0 ? (
            profile.posts
              .filter((item) => item && item.uri) // Filter out undefined/null items
              .map((item) => (
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
                  }}
                  onPress={() => {
                    router.push(`/post/${encodeURIComponent(item.uri)}`);
                  }}
                />
              ))
          ) : (
            <ThemedView style={styles.emptyPosts}>
              <ThemedText style={styles.emptyPostsText}>
                No posts yet
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
