import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useParentPost, usePost, useRootPost } from '@/hooks/queries/usePost';
import { usePostThread } from '@/hooks/queries/usePostThread';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyFeedItem, BlueskyPostView } from '@/utils/bluesky/types';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const mainPostRef = useRef<View>(null);
  const { t } = useTranslation();

  const { data: post, isLoading: postLoading, error: postError } = usePost(id);
  const { data: threadData, isLoading: threadLoading } = usePostThread(id);

  const comments = threadData?.thread?.replies || [];

  // Check if this post is a reply and fetch parent/root posts
  // Use the main post data (from getPost) since threadData doesn't include the main post
  const mainPost = post;
  const isReply = typeof mainPost?.record === 'object' && mainPost?.record && 'reply' in mainPost.record;
  const parentUri =
    typeof mainPost?.record === 'object' &&
    mainPost?.record &&
    'reply' in mainPost.record &&
    mainPost.record.reply &&
    typeof mainPost.record.reply === 'object' &&
    'parent' in mainPost.record.reply &&
    mainPost.record.reply.parent &&
    typeof mainPost.record.reply.parent === 'object' &&
    'uri' in mainPost.record.reply.parent
      ? (mainPost.record.reply.parent as { uri: string }).uri
      : undefined;
  const rootUri =
    typeof mainPost?.record === 'object' &&
    mainPost?.record &&
    'reply' in mainPost.record &&
    mainPost.record.reply &&
    typeof mainPost.record.reply === 'object' &&
    'root' in mainPost.record.reply &&
    mainPost.record.reply.root &&
    typeof mainPost.record.reply.root === 'object' &&
    'uri' in mainPost.record.reply.root
      ? (mainPost.record.reply.root as { uri: string }).uri
      : undefined;

  const { parentPost, isLoading: parentLoading } = useParentPost(parentUri || null);
  const { rootPost, isLoading: rootLoading } = useRootPost(rootUri || null);

  // Scroll to the main post after everything is loaded
  useEffect(() => {
    if (!postLoading && !threadLoading && !parentLoading && !rootLoading && isReply) {
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
          },
        );
      }, 100);
    }
  }, [postLoading, threadLoading, parentLoading, rootLoading, isReply]);

  // Check if this comment is a reply to another comment
  const renderComment = (
    item:
      | BlueskyFeedItem
      | {
          uri: string;
          notFound?: boolean;
          blocked?: boolean;
          author?: BlueskyPostView['author'];
        },
  ) => {
    // Skip null or blocked replies
    if (!item || 'notFound' in item || 'blocked' in item) return null;

    // Handle BlueskyFeedItem type
    if ('post' in item) {
      const post = item.post;
      if (!post.author || !post.author.handle) {
        return null;
      }

      const commentReplyTo = post.reply?.parent
        ? {
            author: {
              handle: post.reply.parent.author?.handle || 'unknown',
              displayName: post.reply.parent.author?.displayName,
            },
            text:
              typeof post.reply.parent.record === 'object' && post.reply.parent.record && 'text' in post.reply.parent.record
                ? (post.reply.parent.record as { text: string }).text
                : undefined,
          }
        : undefined;

      return (
        <PostCard
          key={`${post.uri}-${post.indexedAt}`}
          post={{
            id: post.uri,
            text:
              typeof post.record === 'object' && post.record && 'text' in post.record
                ? (post.record as { text: string }).text
                : undefined,
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

    const postItem = item as BlueskyPostView;
    return (
      <PostCard
        key={`${postItem.uri}-${postItem.indexedAt}`}
        post={{
          id: postItem.uri,
          text:
            typeof postItem.record === 'object' && postItem.record && 'text' in postItem.record
              ? (postItem.record as { text: string }).text
              : undefined,
          author: {
            handle: postItem.author.handle,
            displayName: postItem.author.displayName,
            avatar: postItem.author.avatar,
          },
          createdAt: new Date(postItem.indexedAt).toLocaleDateString(),
          likeCount: postItem.likeCount || 0,
          commentCount: postItem.replyCount || 0,
          repostCount: postItem.repostCount || 0,
          embed: postItem.embed,
          embeds: postItem.embeds,
          labels: postItem.labels,
          viewer: postItem.viewer,
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
          text:
            typeof parentPost.record === 'object' && parentPost.record && 'text' in parentPost.record
              ? (parentPost.record as { text: string }).text
              : undefined,
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
          viewer: parentPost.viewer,
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
          text:
            typeof rootPost.record === 'object' && rootPost.record && 'text' in rootPost.record
              ? (rootPost.record as { text: string }).text
              : undefined,
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
          viewer: rootPost.viewer,
        }}
      />
    );
  };

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  if (postLoading || threadLoading || parentLoading || rootLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('navigation.post'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <ThemedView style={styles.container}>
          <ThemedText style={styles.loadingText}>{t('post.loadingPost')}</ThemedText>
        </ThemedView>
      </>
    );
  }

  if (postError || !post) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('navigation.post'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>{t('post.postNotFound')}</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('navigation.post'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
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
                id: mainPost?.uri || '',
                text:
                  typeof mainPost?.record === 'object' && mainPost?.record && 'text' in mainPost.record
                    ? (mainPost.record as { text: string }).text
                    : undefined,
                author: {
                  handle: mainPost?.author?.handle || '',
                  displayName: mainPost?.author?.displayName,
                  avatar: mainPost?.author?.avatar,
                },
                createdAt: new Date(mainPost?.indexedAt || Date.now()).toLocaleDateString(),
                likeCount: mainPost?.likeCount || 0,
                commentCount: mainPost?.replyCount || 0,
                repostCount: mainPost?.repostCount || 0,
                embed: mainPost?.embed,
                embeds: mainPost?.embeds,
                labels: mainPost?.labels,
                viewer: mainPost?.viewer,
              }}
            />
          </View>

          {/* Comments Section */}
          <ThemedView style={[styles.commentsSection, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.commentsTitle}>{t('post.comments', { count: comments?.length || 0 })}</ThemedText>
          </ThemedView>

          {/* Comments List */}
          {comments.length > 0 ? (
            comments
              .filter(
                (
                  item,
                ): item is
                  | BlueskyFeedItem
                  | {
                      uri: string;
                      notFound?: boolean;
                      blocked?: boolean;
                      author?: BlueskyPostView['author'];
                    } => item !== null && !('notFound' in item) && !('blocked' in item),
              )
              .map(renderComment)
          ) : (
            <ThemedView style={styles.emptyComments}>
              <ThemedText style={styles.emptyCommentsText}>{t('post.noCommentsYet')}</ThemedText>
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
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: 'red',
  },
  parentPostContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyComments: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
