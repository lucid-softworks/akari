import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useParentPost, usePost, useRootPost } from "@/hooks/queries/usePost";
import { usePostThread } from "@/hooks/queries/usePostThread";
import { useThemeColor } from "@/hooks/useThemeColor";
import { BlueskyFeedItem } from "@/utils/bluesky/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const mainPostRef = useRef<View>(null);

  const { data: post, isLoading: postLoading, error: postError } = usePost(id);
  const { data: threadData, isLoading: threadLoading } = usePostThread(id);

  const comments = threadData?.thread?.replies || [];

  // Check if this post is a reply and fetch parent/root posts
  // Use the main post data (from getPost) since threadData doesn't include the main post
  const mainPost = post;
  const isReply = mainPost?.record?.reply;
  const parentUri = mainPost?.record?.reply?.parent?.uri;
  const rootUri = mainPost?.record?.reply?.root?.uri;

  const { parentPost, isLoading: parentLoading } = useParentPost(parentUri);
  const { rootPost, isLoading: rootLoading } = useRootPost(rootUri);

  // Scroll to the main post after everything is loaded
  useEffect(() => {
    if (
      !postLoading &&
      !threadLoading &&
      !parentLoading &&
      !rootLoading &&
      isReply
    ) {
      // Wait a bit for the layout to complete, then scroll to the main post
      setTimeout(() => {
        mainPostRef.current?.measureLayout(
          scrollViewRef.current as unknown as View,
          (x: number, y: number) => {
            // Scroll to make the main post flush with the top
            scrollViewRef.current?.scrollTo({ y: y, animated: false });
          },
          () => {
            // Fallback if measureLayout fails - scroll to a reasonable position
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          }
        );
      }, 100);
    }
  }, [postLoading, threadLoading, parentLoading, rootLoading, isReply]);

  // Check if this comment is a reply to another comment
  const renderComment = (
    item:
      | BlueskyFeedItem
      | { uri: string; notFound?: boolean; blocked?: boolean; author?: any }
  ) => {
    // Skip null or blocked replies
    if (!item || "notFound" in item || "blocked" in item) return null;

    // Handle BlueskyFeedItem type
    if ("post" in item) {
      const post = item.post;
      if (!post.author || !post.author.handle) {
        return null;
      }

      const commentReplyTo = post.reply?.parent
        ? {
            author: {
              handle: post.reply.parent.author?.handle || "unknown",
              displayName: post.reply.parent.author?.displayName,
            },
            text: post.reply.parent.record?.text || "No text content",
          }
        : undefined;

      return (
        <PostCard
          key={post.uri}
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
            replyTo: commentReplyTo,
          }}
        />
      );
    }

    // Handle direct post type
    if (!item.author || !item.author.handle) {
      return null;
    }

    return (
      <PostCard
        key={item.uri}
        post={{
          id: item.uri,
          text: (item as any).record?.text || "No text content",
          author: {
            handle: item.author.handle,
            displayName: item.author.displayName,
            avatar: item.author.avatar,
          },
          createdAt: new Date((item as any).indexedAt).toLocaleDateString(),
          likeCount: (item as any).likeCount || 0,
          commentCount: (item as any).replyCount || 0,
          repostCount: (item as any).repostCount || 0,
          embed: (item as any).embed,
          embeds: (item as any).embeds,
          labels: (item as any).labels,
        }}
      />
    );
  };

  // Render parent post if this is a reply
  const renderParentPost = () => {
    if (!isReply || !parentPost) {
      return null;
    }

    if (!parentPost.author) {
      return null;
    }

    return (
      <PostCard
        post={{
          id: parentPost.uri,
          text: parentPost.record?.text || "No text content",
          author: {
            handle: parentPost.author.handle,
            displayName: parentPost.author.displayName,
            avatar: parentPost.author.avatar,
          },
          createdAt: new Date(parentPost.indexedAt).toLocaleDateString(),
          likeCount: parentPost.likeCount || 0,
          commentCount: parentPost.replyCount || 0,
          repostCount: parentPost.repostCount || 0,
          embed: parentPost.embed,
          embeds: parentPost.embeds,
          labels: parentPost.labels,
        }}
      />
    );
  };

  // Render grandparent post if this is a reply to a reply
  const renderGrandparentPost = () => {
    if (!rootPost) return null;

    return (
      <PostCard
        post={{
          id: rootPost.uri,
          text: rootPost.record?.text || "No text content",
          author: {
            handle: rootPost.author.handle,
            displayName: rootPost.author.displayName,
            avatar: rootPost.author.avatar,
          },
          createdAt: new Date(rootPost.indexedAt).toLocaleDateString(),
          likeCount: rootPost.likeCount || 0,
          commentCount: rootPost.replyCount || 0,
          repostCount: rootPost.repostCount || 0,
          embed: rootPost.embed,
          embeds: rootPost.embeds,
        }}
      />
    );
  };

  const borderColor = useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );

  if (postLoading || threadLoading || parentLoading || rootLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Post", headerBackTitle: "Back" }} />
        <SafeAreaView style={styles.container}>
          <ThemedView style={styles.container}>
            <ThemedText style={styles.loadingText}>Loading post...</ThemedText>
          </ThemedView>
        </SafeAreaView>
      </>
    );
  }

  if (postError || !post) {
    return (
      <>
        <Stack.Screen options={{ title: "Post", headerBackTitle: "Back" }} />
        <SafeAreaView style={styles.container}>
          <ThemedView style={styles.container}>
            <ThemedText style={styles.errorText}>Post not found</ThemedText>
          </ThemedView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Post", headerBackTitle: "Back" }} />
      <ThemedView style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Thread Context - Root Post (if this is a reply to a reply) */}
          {renderGrandparentPost()}

          {/* Thread Context - Parent Post */}
          {renderParentPost()}

          {/* Main Post (the reply you're viewing) */}
          <View ref={mainPostRef}>
            <PostCard
              post={{
                id: mainPost?.uri || "",
                text: mainPost?.record?.text || "No text content",
                author: {
                  handle: mainPost?.author?.handle || "",
                  displayName: mainPost?.author?.displayName,
                  avatar: mainPost?.author?.avatar,
                },
                createdAt: new Date(
                  mainPost?.indexedAt || Date.now()
                ).toLocaleDateString(),
                likeCount: mainPost?.likeCount || 0,
                commentCount: mainPost?.replyCount || 0,
                repostCount: mainPost?.repostCount || 0,
                embed: mainPost?.embed,
                embeds: mainPost?.embeds,
                labels: mainPost?.labels,
              }}
            />
          </View>

          {/* Comments Section */}
          <ThemedView
            style={[styles.commentsSection, { borderBottomColor: borderColor }]}
          >
            <ThemedText style={styles.commentsTitle}>
              Comments ({comments.length})
            </ThemedText>
          </ThemedView>

          {/* Comments List */}
          {comments.length > 0 ? (
            comments
              .filter(
                (
                  item
                ): item is
                  | BlueskyFeedItem
                  | {
                      uri: string;
                      notFound?: boolean;
                      blocked?: boolean;
                      author?: any;
                    } =>
                  item !== null && !("notFound" in item) && !("blocked" in item)
              )
              .map(renderComment)
          ) : (
            <ThemedView style={styles.emptyComments}>
              <ThemedText style={styles.emptyCommentsText}>
                No comments yet
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </ThemedView>
    </>
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
    paddingBottom: 800, // Almost a full viewport height to ensure enough scrollable content
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
  parentPostContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  emptyComments: {
    padding: 20,
    alignItems: "center",
  },
  emptyCommentsText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
