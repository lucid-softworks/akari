import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, fontSize, fontWeight, opacity } from '@/constants/tokens';
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

const renderComment = (
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
          threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
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
        threadRootUri: (postItem.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
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
  // Tracks the y-offset of the focused post inside the scroll content. We
  // want the focused post at the *top* of the viewport on initial open
  // (parents above are scrollable up; replies below sit in view) — see
  // bsky's notification-tap behavior. Async parent/root queries push the
  // focused post down as they resolve, so we re-scroll on every layout
  // change up until the user has interacted with the scroller.
  const focusedPostYRef = useRef(0);
  const hasUserScrolledRef = useRef(false);
  // Heights tracked per-section so the bottom padding can be exactly
  // `windowHeight - lastPostHeight` — just enough headroom to scroll the
  // last post (focused if no replies; otherwise the last reply) up to
  // sit at the top of the viewport, no extra empty space.
  const [focusedPostHeight, setFocusedPostHeight] = useState(0);
  const [lastReplyHeight, setLastReplyHeight] = useState(0);

  const handleFocusedPostLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    focusedPostYRef.current = y;
    setFocusedPostHeight(height);
    if (hasUserScrolledRef.current) return;
    scrollViewRef.current?.scrollTo({ y, animated: false });
  }, []);

  const handleLastReplyLayout = useCallback((event: LayoutChangeEvent) => {
    setLastReplyHeight(event.nativeEvent.layout.height);
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    hasUserScrolledRef.current = true;
  }, []);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({}, 'tint');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Get the post data
  const { data: post, isLoading: postLoading, error: postError } = usePost({ actor, rKey });

  // The focused post's atproto record carries `reply.parent.uri` and
  // `reply.root.uri` when it's a reply — pull those off and feed them to
  // the parent / root post queries. Previously this passed `post.uri`,
  // which made both hooks fetch the focused post itself and the parent /
  // grandparent rows silently no-op'd via the `=== post.uri` guard, so
  // tapping a reply notification landed on the reply with no thread
  // context above it at all.
  const replyRefs =
    post?.record && typeof post.record === 'object' && 'reply' in post.record
      ? (post.record as { reply?: { parent?: { uri?: string }; root?: { uri?: string } } }).reply
      : undefined;
  const parentUri = replyRefs?.parent?.uri ?? null;
  const rootUri = replyRefs?.root?.uri ?? null;

  // Always fetch + render the thread root when this is a reply, so the
  // user can always see what conversation they're in. The parent is
  // skipped when it's the same post as the root (one-deep reply: the
  // root IS the parent), otherwise we'd render the same card twice.
  const { data: rootPost } = useRootPost(rootUri);
  const { data: parentPost } = useParentPost(parentUri && parentUri !== rootUri ? parentUri : null);


  // Get the full thread (replies)
  const { data: threadData, isLoading: threadLoading } = usePostThread(post?.uri || null);

  // Reset per-thread state when navigating to a different post: the
  // "user has scrolled" gate so the new focused post gets snapped to
  // the top once its layout fires, and the cached reply height so the
  // bottom padding doesn't stay tuned for the previous thread's last
  // reply when this one has none / a different last reply.
  useEffect(() => {
    hasUserScrolledRef.current = false;
    setLastReplyHeight(0);
  }, [post?.uri]);

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
            threadRootUri: (rootPost.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
          }}
          onPress={() => {
            // Navigate to root post in current tab
            const uriParts = rootPost.uri.split('/');
            const rootRKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: rootPost.author.handle, rKey: rootRKey });
          }}
        />
    );
  };

  const renderParentPost = () => {
    if (!parentPost || parentPost.uri === post.uri) return null;

    return (
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
            threadRootUri: (parentPost.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
          }}
          onPress={() => {
            // Navigate to parent post in current tab
            const uriParts = parentPost.uri.split('/');
            const parentRKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: parentPost.author.handle, rKey: parentRKey });
          }}
        />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        // Pad just enough to let the *last* post (focused if no replies,
        // otherwise the last reply) scroll up to sit at the top of the
        // viewport — `windowHeight - lastPostHeight`. Without it,
        // scrollTo gets clamped by `contentHeight - viewportHeight` and
        // we can't get the focused post to the top on short threads.
        contentContainerStyle={[
          styles.scrollViewContent,
          {
            paddingBottom: Math.max(
              0,
              windowHeight - (lastReplyHeight || focusedPostHeight),
            ),
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBeginDrag}
      >
        {/* Thread Context - Root Post (if this is a reply to a reply) */}
        {renderGrandparentPost()}

        {/* Thread Context - Parent Post */}
        {renderParentPost()}

        {/* Main Post — wrapped so we can capture its y-offset and snap the
            scroll position to it on initial open / async parent loads. */}
        <View onLayout={handleFocusedPostLayout}>
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
              threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
            }}
          />
        </View>

        {/* Replies */}
        {threadLoading ? (
          <FeedSkeleton count={3} />
        ) : threadData?.thread?.replies && threadData.thread.replies.length > 0 ? (
          <View style={styles.repliesContainer}>
            <ThemedText style={styles.repliesLabel}>{t('common.replies')}</ThemedText>
            {threadData.thread.replies.map((reply, index) => {
              const isLast = index === threadData.thread!.replies!.length - 1;
              return (
                <View
                  key={'post' in reply ? reply.post.uri : `reply-${index}`}
                  // The last reply's height drives the scroll-to-top
                  // bottom-padding calculation up at the ScrollView level.
                  onLayout={isLast ? handleLastReplyLayout : undefined}
                >
                  {renderComment(reply, navigateToPost)}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* Reply Bar */}
      <Pressable
        style={({ pressed }) => [styles.replyBar, { borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom - spacing.lg, spacing.xs) }, pressed && { opacity: 0.7 }]}
        onPress={() => setShowReplyComposer(true)}
        
      >
        <IconSymbol name="arrowshape.turn.up.left" size={18} color={accentColor} />
        <ThemedText style={[styles.replyBarText, { color: secondaryText }]}>
          {t('post.reply')}...
        </ThemedText>
      </Pressable>

      {/* Reply Composer */}
      <PostComposer
        visible={showReplyComposer}
        onClose={() => setShowReplyComposer(false)}
        replyTo={{
          root:
            (post?.record as { reply?: { root?: { uri?: string } } } | undefined)?.reply?.root?.uri ||
            post?.uri ||
            '',
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
