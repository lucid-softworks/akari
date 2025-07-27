import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { usePost } from "@/hooks/queries/usePost";
import { usePostThread } from "@/hooks/queries/usePostThread";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: post, isLoading: postLoading, error: postError } = usePost(id);
  const { data: threadData, isLoading: threadLoading } = usePostThread(id);

  const comments = threadData?.thread?.replies || [];

  const borderColor = useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );

  if (postLoading || threadLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.loadingText}>Loading post...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (postError || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>Post not found</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const renderComment = ({ item }: { item: any }) => (
    <PostCard
      post={{
        id: item.post.uri,
        text: item.post.record?.text || "No text content",
        author: {
          handle: item.post.author.handle,
          displayName: item.post.author.displayName,
          avatar: item.post.author.avatar,
        },
        createdAt: new Date(item.post.indexedAt).toLocaleDateString(),
        likeCount: item.post.likeCount || 0,
        commentCount: item.post.replyCount || 0,
        repostCount: item.post.repostCount || 0,
        embed: item.post.embed,
        embeds: item.post.embeds,
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        {/* Main Post */}
        <PostCard
          post={{
            id: post.uri,
            text: post.record?.text || "No text content",
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
          }}
        />

        {/* Comments Section */}
        <ThemedView
          style={[styles.commentsSection, { borderBottomColor: borderColor }]}
        >
          <ThemedText style={styles.commentsTitle}>
            Comments ({comments.length})
          </ThemedText>
        </ThemedView>

        {/* Comments List */}
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.post.uri}
          style={styles.commentsList}
          contentContainerStyle={styles.commentsListContent}
          ListEmptyComponent={
            <ThemedView style={styles.emptyComments}>
              <ThemedText style={styles.emptyCommentsText}>
                No comments yet
              </ThemedText>
            </ThemedView>
          }
        />
      </ThemedView>
    </SafeAreaView>
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
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 100, // Account for tab bar
  },
  emptyComments: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyCommentsText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
