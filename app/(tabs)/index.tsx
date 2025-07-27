import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, FlatList, StyleSheet } from "react-native";
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

  const handleLogout = () => {
    Alert.alert(
      "Disconnect Bluesky",
      "Are you sure you want to disconnect your Bluesky account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            jwtStorage.clearAuth();
            router.replace("/(auth)/signin");
          },
        },
      ]
    );
  };

  // Don't render anything if not authenticated or still loading
  if (isLoading || !authData?.isAuthenticated) {
    return null;
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
        embed: item.embed,
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
          avatar: profile?.avatar,
          displayName: profile?.displayName || userData.handle || "",
          handle: userData.handle || "",
          description: profile?.description,
          banner: profile?.banner,
        }}
        showLogoutButton={true}
        onLogout={handleLogout}
      />

      {/* Posts Section */}
      <ThemedView
        style={[styles.postsSection, { borderBottomColor: borderColor }]}
      >
        <ThemedText style={styles.postsTitle}>Your Posts</ThemedText>
      </ThemedView>

      {/* Posts List */}
      <FlatList
        data={profile?.posts || []}
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
