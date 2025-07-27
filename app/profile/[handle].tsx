import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
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
    />
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Banner */}
      {profile.banner && (
        <ThemedView style={styles.banner}>
          <Image
            source={{ uri: profile.banner }}
            style={styles.bannerImage}
            contentFit="cover"
          />
        </ThemedView>
      )}

      {/* Profile Header */}
      <ThemedView
        style={[styles.profileHeader, { borderBottomColor: borderColor }]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <View style={styles.avatar}>
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
          ) : (
            <View style={styles.avatar}>
              <View style={styles.avatarFallbackContainer}>
                <ThemedText style={styles.avatarFallback}>
                  {(profile.displayName ||
                    profile.handle ||
                    "U")[0].toUpperCase()}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        <ThemedView style={styles.profileInfo}>
          <ThemedText style={styles.displayName}>
            {profile.displayName || profile.handle}
          </ThemedText>
          <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
          {profile.description && (
            <ThemedText style={styles.description}>
              {profile.description}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

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
  banner: {
    height: 120,
    backgroundColor: "#f0f0f0",
  },
  bannerImage: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarContainer: {
    marginTop: -30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarFallbackContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallback: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  handle: {
    fontSize: 16,
    opacity: 0.7,
  },
  description: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 4,
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
