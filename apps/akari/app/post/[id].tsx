import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { PostDetailSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useParentPost, usePost, useRootPost } from '@/hooks/queries/usePost';
import { usePostThread } from '@/hooks/queries/usePostThread';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyFeedItem, BlueskyPostView } from '@/bluesky-api';
import { formatRelativeTime } from '@/utils/timeUtils';
import {
  VirtualizedList,
  type VirtualizedListHandle,
} from '@/components/ui/VirtualizedList';

type ThreadRenderableComment =
  | BlueskyFeedItem
  | {
      uri: string;
      notFound?: boolean;
      blocked?: boolean;
      author?: BlueskyPostView['author'];
    };

type ThreadListItem =
  | { type: 'grandparent'; post: BlueskyPostView }
  | { type: 'parent'; post: BlueskyPostView }
  | { type: 'main'; post: BlueskyPostView }
  | { type: 'commentsHeader'; count: number }
  | { type: 'comment'; comment: ThreadRenderableComment }
  | { type: 'emptyComments' };

export const renderComment = (item: ThreadRenderableComment) => {
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
            typeof post.reply.parent.record === 'object' &&
            post.reply.parent.record &&
            'text' in post.reply.parent.record
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
            typeof post.record === 'object' &&
            post.record &&
            'text' in post.record
              ? (post.record as { text: string }).text
              : undefined,
          author: {
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
          },
          createdAt: formatRelativeTime(post.indexedAt),
          likeCount: post.likeCount || 0,
          commentCount: post.replyCount || 0,
          repostCount: post.repostCount || 0,
          embed: post.embed,
          embeds: post.embeds,
          labels: post.labels,
          viewer: post.viewer,
          facets: (post.record as any)?.facets,
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
          typeof postItem.record === 'object' &&
          postItem.record &&
          'text' in postItem.record
            ? (postItem.record as { text: string }).text
            : undefined,
        author: {
          handle: postItem.author.handle,
          displayName: postItem.author.displayName,
          avatar: postItem.author.avatar,
        },
        createdAt: formatRelativeTime(postItem.indexedAt),
        likeCount: postItem.likeCount || 0,
        commentCount: postItem.replyCount || 0,
        repostCount: postItem.repostCount || 0,
        embed: postItem.embed,
        embeds: postItem.embeds,
        labels: postItem.labels,
        viewer: postItem.viewer,
        facets: (postItem.record as any)?.facets,
        uri: postItem.uri,
        cid: postItem.cid,
      }}
    />
  );
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<VirtualizedListHandle<ThreadListItem>>(null);
  const { t } = useTranslation();

  const { data: post, isLoading: postLoading, error: postError } = usePost(id);

  const { data: threadData, isLoading: threadLoading } = usePostThread(id);

  const comments = threadData?.thread?.replies || [];

  const safeComments = useMemo(
    () =>
      comments.filter(
        (
          item,
        ): item is ThreadRenderableComment =>
          item !== null && !('notFound' in item) && !('blocked' in item),
      ),
    [comments],
  );

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

  const threadItems = useMemo<ThreadListItem[]>(() => {
    const items: ThreadListItem[] = [];

    if (rootPost) {
      items.push({ type: 'grandparent', post: rootPost });
    }

    if (parentPost && parentPost.author) {
      items.push({ type: 'parent', post: parentPost });
    }

    if (mainPost) {
      items.push({ type: 'main', post: mainPost });
    }

    items.push({ type: 'commentsHeader', count: safeComments.length });

    if (safeComments.length === 0) {
      items.push({ type: 'emptyComments' });
    } else {
      for (const comment of safeComments) {
        items.push({ type: 'comment', comment });
      }
    }

    return items;
  }, [mainPost, parentPost, rootPost, safeComments]);

  const mainPostIndex = useMemo(
    () => threadItems.findIndex((item) => item.type === 'main'),
    [threadItems],
  );

  // Scroll to the main post after everything is loaded
  useEffect(() => {
    if (!postLoading && !threadLoading && !parentLoading && !rootLoading && isReply && mainPostIndex >= 0) {
      const timeout = setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: mainPostIndex, animated: false });
        } catch {
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
      }, 100);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [postLoading, threadLoading, parentLoading, rootLoading, isReply, mainPostIndex]);

  // Render parent post if this is a reply
  const renderParentPost = () => {
    if (!isReply || !parentPost || !parentPost.author) {
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
          createdAt: formatRelativeTime(parentPost.indexedAt),
          likeCount: parentPost.likeCount || 0,
          commentCount: parentPost.replyCount || 0,
          repostCount: parentPost.repostCount || 0,
          embed: parentPost.embed,
          embeds: parentPost.embeds,
          labels: parentPost.labels,
          viewer: parentPost.viewer,
          facets: (parentPost.record as any)?.facets,
          uri: parentPost.uri,
          cid: parentPost.cid,
        }}
      />
    );
  };

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
          createdAt: formatRelativeTime(rootPost.indexedAt),
          likeCount: rootPost.likeCount || 0,
          commentCount: rootPost.replyCount || 0,
          repostCount: rootPost.repostCount || 0,
          embed: rootPost.embed,
          embeds: rootPost.embeds,
          labels: rootPost.labels,
          viewer: rootPost.viewer,
          facets: (rootPost.record as any)?.facets,
          uri: rootPost.uri,
          cid: rootPost.cid,
        }}
      />
    );
  };

  const renderThreadItem = ({ item }: { item: ThreadListItem }) => {
    switch (item.type) {
      case 'grandparent':
        return renderGrandparentPost();
      case 'parent':
        return renderParentPost();
      case 'main':
        return (
          <PostCard
            post={{
              id: item.post?.uri || '',
              text:
                typeof item.post?.record === 'object' && item.post?.record && 'text' in item.post.record
                  ? (item.post.record as { text: string }).text
                  : undefined,
              author: {
                handle: item.post?.author?.handle || '',
                displayName: item.post?.author?.displayName,
                avatar: item.post?.author?.avatar,
              },
              createdAt: formatRelativeTime(item.post?.indexedAt || new Date()),
              likeCount: item.post?.likeCount || 0,
              commentCount: item.post?.replyCount || 0,
              repostCount: item.post?.repostCount || 0,
              embed: item.post?.embed,
              embeds: item.post?.embeds,
              labels: item.post?.labels,
              viewer: item.post?.viewer,
              facets: (item.post?.record as any)?.facets,
              uri: item.post?.uri,
              cid: item.post?.cid,
            }}
          />
        );
      case 'commentsHeader':
        return (
          <ThemedView style={[styles.commentsSection, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.commentsTitle}>{t('post.comments', { count: item.count })}</ThemedText>
          </ThemedView>
        );
      case 'emptyComments':
        return (
          <ThemedView style={styles.emptyComments}>
            <ThemedText style={styles.emptyCommentsText}>{t('post.noCommentsYet')}</ThemedText>
          </ThemedView>
        );
      case 'comment':
        return renderComment(item.comment);
      default:
        return null;
    }
  };

  const keyExtractor = (item: ThreadListItem, index: number) => {
    switch (item.type) {
      case 'grandparent':
        return 'grandparent';
      case 'parent':
        return 'parent';
      case 'main':
        return 'main';
      case 'commentsHeader':
        return 'comments-header';
      case 'emptyComments':
        return 'comments-empty';
      case 'comment':
        if ('post' in item.comment && item.comment.post) {
          return `comment-${item.comment.post.uri}`;
        }
        return `comment-${item.comment.uri}-${index}`;
      default:
        return `item-${index}`;
    }
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
        <ResponsiveLayout>
          <PostDetailSkeleton />
        </ResponsiveLayout>
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
        <ResponsiveLayout>
          <ThemedView style={styles.container}>
            <ThemedText style={styles.errorText}>{t('post.postNotFound')}</ThemedText>
          </ThemedView>
        </ResponsiveLayout>
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
      <ResponsiveLayout>
        <ThemedView style={styles.container}>
          <VirtualizedList
            ref={listRef}
            data={threadItems}
            renderItem={renderThreadItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.scrollViewContent}
            estimatedItemSize={320}
            showsVerticalScrollIndicator={false}
          />
        </ThemedView>
      </ResponsiveLayout>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
