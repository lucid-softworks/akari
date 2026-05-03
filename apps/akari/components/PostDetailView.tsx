import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, radius, fontSize, fontWeight, opacity, layout } from '@/constants/tokens';
import { BlueskyFeedItem, BlueskyPostView } from '@/bluesky-api';
import { PostCard } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FeedSkeleton, PostDetailSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useParentPost, usePost, useRootPost } from '@/hooks/queries/usePost';
import { usePostThread } from '@/hooks/queries/usePostThread';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

export const renderComment = (
  item:
    | BlueskyFeedItem
    | {
        uri: string;
        notFound?: boolean;
        blocked?: boolean;
        author?: BlueskyPostView['author'];
      },
  navigateToPost: (args: { actor: string; rKey: string }) => void,
) => {
  // Skip null or blocked replies
  if (!item || 'notFound' in item || 'blocked' in item) return null;

  // Handle BlueskyFeedItem type
  if ('post' in item) {
    const post = item.post;
    if (!post.author || !post.author.handle) {
      return null;
    }

    const replyTo = post.reply?.parent
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
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            verification: post.author.verification,
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
          replyTo,
          uri: post.uri,
          cid: post.cid,
        }}
        onPress={() => {
          // Navigate to the same tab's post view
          const uriParts = post.uri.split('/');
          const rKey = uriParts[uriParts.length - 1];
          navigateToPost({ actor: post.author.handle, rKey });
        }}
      />
    );
  }

  // Handle direct post item
  const postItem = item as BlueskyPostView;
  if (!postItem.author || !postItem.author.handle) {
    return null;
  }

  const replyTo = postItem.reply?.parent
    ? {
        author: {
          handle: postItem.reply.parent.author?.handle || 'unknown',
          displayName: postItem.reply.parent.author?.displayName,
        },
        text:
          typeof postItem.reply.parent.record === 'object' &&
          postItem.reply.parent.record &&
          'text' in postItem.reply.parent.record
            ? (postItem.reply.parent.record as { text: string }).text
            : undefined,
      }
    : undefined;

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
          did: postItem.author.did,
          handle: postItem.author.handle,
          displayName: postItem.author.displayName,
          avatar: postItem.author.avatar,
          verification: postItem.author.verification,
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
        replyTo,
        uri: postItem.uri,
        cid: postItem.cid,
      }}
      onPress={() => {
        // Navigate to the same tab's post view
        const uriParts = postItem.uri.split('/');
        const rKey = uriParts[uriParts.length - 1];
        navigateToPost({ actor: postItem.author.handle, rKey });
      }}
    />
  );
};

type PostDetailViewProps = {
  actor: string;
  rKey: string;
};

export default function PostDetailView({ actor, rKey }: PostDetailViewProps) {
  const { t } = useTranslation();
  const navigateToPost = useNavigateToPost();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({}, 'tint');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const insets = useSafeAreaInsets();

  // Get the post data
  const { data: post, isLoading: postLoading, error: postError } = usePost({ actor, rKey });

  // Get parent post if this is a reply
  const { data: parentPost } = useParentPost(post?.uri || null);

  // Get root post if this is a reply to a reply
  const { data: rootPost } = useRootPost(post?.uri || null);


  // Get the full thread (replies)
  const { data: threadData, isLoading: threadLoading } = usePostThread(post?.uri || null);

  // Scroll to top when post changes
  useEffect(() => {
    if (post && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [post]);

  if (postLoading) {
    return (
      <ThemedView style={styles.container}>
        <PostDetailSkeleton />
      </ThemedView>
    );
  }

  if (postError || !post) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{t('post.postNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  const renderGrandparentPost = () => {
    if (!rootPost || rootPost.uri === post.uri) return null;

    return (
      <View style={styles.threadContext}>
        <ThemedText style={styles.threadContextLabel}>{t('common.replies')}</ThemedText>
        <PostCard
          post={{
            id: rootPost.uri,
            text:
              typeof rootPost.record === 'object' && rootPost.record && 'text' in rootPost.record
                ? (rootPost.record as { text: string }).text
                : undefined,
            author: {
              did: rootPost.author.did,
              handle: rootPost.author.handle,
              displayName: rootPost.author.displayName,
              avatar: rootPost.author.avatar,
              verification: rootPost.author.verification,
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
          onPress={() => {
            // Navigate to root post in current tab
            const uriParts = rootPost.uri.split('/');
            const rKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: rootPost.author.handle, rKey });
          }}
        />
      </View>
    );
  };

  const renderParentPost = () => {
    if (!parentPost || parentPost.uri === post.uri) return null;

    return (
      <View style={styles.threadContext}>
        <ThemedText style={styles.threadContextLabel}>{t('post.replyingTo')}</ThemedText>
        <PostCard
          post={{
            id: parentPost.uri,
            text:
              typeof parentPost.record === 'object' && parentPost.record && 'text' in parentPost.record
                ? (parentPost.record as { text: string }).text
                : undefined,
            author: {
              did: parentPost.author.did,
              handle: parentPost.author.handle,
              displayName: parentPost.author.displayName,
              avatar: parentPost.author.avatar,
              verification: parentPost.author.verification,
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
          onPress={() => {
            // Navigate to parent post in current tab
            const uriParts = parentPost.uri.split('/');
            const rKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: parentPost.author.handle, rKey });
          }}
        />
      </View>
    );
  };

  return (
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

        {/* Main Post */}
        <PostCard
          post={{
            id: post.uri,
            text:
              typeof post.record === 'object' && post.record && 'text' in post.record
                ? (post.record as { text: string }).text
                : undefined,
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
              verification: post.author.verification,
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
            uri: post.uri,
            cid: post.cid,
          }}
        />

        {/* Replies */}
        {threadLoading ? (
          <FeedSkeleton count={3} />
        ) : threadData?.thread?.replies && threadData.thread.replies.length > 0 ? (
          <View style={styles.repliesContainer}>
            <ThemedText style={styles.repliesLabel}>{t('common.replies')}</ThemedText>
            {threadData.thread.replies.map((reply, index) => (
              <View key={'post' in reply ? reply.post.uri : `reply-${index}`}>
                {renderComment(reply, navigateToPost)}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Reply Bar */}
      <TouchableOpacity
        style={[styles.replyBar, { borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom - spacing.lg, spacing.xs) }]}
        onPress={() => setShowReplyComposer(true)}
        activeOpacity={0.7}
      >
        <IconSymbol name="arrowshape.turn.up.left" size={18} color={accentColor} />
        <ThemedText style={[styles.replyBarText, { color: secondaryText }]}>
          {t('post.reply')}...
        </ThemedText>
      </TouchableOpacity>

      {/* Reply Composer */}
      <PostComposer
        visible={showReplyComposer}
        onClose={() => setShowReplyComposer(false)}
        replyTo={{
          root: post?.uri || '',
          parent: post?.uri || '',
          authorHandle: post?.author.handle || actor,
          preview: post
            ? {
                text:
                  typeof post.record === 'object' && post.record && 'text' in post.record
                    ? (post.record as { text: string }).text
                    : undefined,
                author: {
                  handle: post.author.handle,
                  displayName: post.author.displayName,
                  avatar: post.author.avatar,
                },
                embed: post.embed,
                embeds: post.embeds,
                facets:
                  typeof post.record === 'object' && post.record && 'facets' in post.record
                    ? ((post.record as {
                        facets?: {
                          index: { byteStart: number; byteEnd: number };
                          features: { $type: string; uri?: string; tag?: string; did?: string }[];
                        }[];
                      }).facets ?? undefined)
                    : undefined,
              }
            : undefined,
        }}
      />
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
    paddingBottom: spacing.xl,
  },
  threadContext: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.border,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  threadContextLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    opacity: opacity.secondary,
  },
  repliesContainer: {
    marginTop: spacing.lg,
  },
  repliesLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBarText: {
    fontSize: fontSize.lg,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: 50,
    opacity: opacity.secondary,
  },
});
