import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, useWindowDimensions } from 'react-native';

import { MastodonStatusDetailView } from '@/components/mastodon/MastodonStatusDetailView';
import { spacing, fontSize, fontWeight, opacity } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
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

type CommentItem =
  | BlueskyFeedItem
  | {
      uri: string;
      notFound?: boolean;
      blocked?: boolean;
      author?: BlueskyPostView['author'];
    };

type CommentRowProps = {
  item: CommentItem;
  navigateToPost: (args: { actor: string; rKey: string }) => void;
};

function CommentRow({ item, navigateToPost }: CommentRowProps) {
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
            labels: post.author.labels,
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
          labels: postItem.author.labels,
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
}

type ThreadContextPostProps = {
  post: BlueskyPostView;
  focusedUri: string;
  navigateToPost: (args: { actor: string; rKey: string }) => void;
};

/**
 * Render a parent or grandparent post above the focused post in the thread.
 * Returns `null` when the post is the focused one (so the same card isn't
 * rendered twice) — the focused PostCard is handled separately in the main
 * scroll content.
 */
function ThreadContextPost({ post: ctxPost, focusedUri, navigateToPost }: ThreadContextPostProps) {
  if (ctxPost.uri === focusedUri) return null;

  return (
    <PostCard
      post={{
        id: ctxPost.uri,
        text:
          typeof ctxPost.record === 'object' && ctxPost.record && 'text' in ctxPost.record
            ? (ctxPost.record as { text: string }).text
            : undefined,
        author: {
          did: ctxPost.author.did,
          handle: ctxPost.author.handle,
          displayName: ctxPost.author.displayName,
          avatar: ctxPost.author.avatar,
          verification: ctxPost.author.verification,
          labels: ctxPost.author.labels,
        },
        createdAt: formatRelativeTime(ctxPost.indexedAt),
        likeCount: ctxPost.likeCount || 0,
        commentCount: ctxPost.replyCount || 0,
        repostCount: ctxPost.repostCount || 0,
        embed: ctxPost.embed,
        embeds: ctxPost.embeds,
        labels: ctxPost.labels,
        viewer: ctxPost.viewer,
        facets: (ctxPost.record as any)?.facets,
        uri: ctxPost.uri,
        cid: ctxPost.cid,
        threadRootUri: (ctxPost.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
      }}
      onPress={() => {
        const uriParts = ctxPost.uri.split('/');
        const ctxRKey = uriParts[uriParts.length - 1];
        navigateToPost({ actor: ctxPost.author.handle, rKey: ctxRKey });
      }}
    />
  );
}

type ThreadBodyProps = {
  post: BlueskyPostView;
  rootPost?: BlueskyPostView | null;
  parentPost?: BlueskyPostView | null;
  threadLoading: boolean;
  threadData: ReturnType<typeof usePostThread>['data'];
  borderColor: string;
  accentColor: string;
  secondaryText: string;
  onFocusedPostLayout: (event: LayoutChangeEvent) => void;
  onLastReplyLayout: (event: LayoutChangeEvent) => void;
  onReplyPress: () => void;
  navigateToPost: (args: { actor: string; rKey: string }) => void;
};

/**
 * Body of the post-detail thread: root/parent context cards, the focused
 * post, the inline reply bar, and the replies list. Extracted so the
 * outer screen can wrap it in either a `<ScrollView>` (native, internal
 * scroll) or a plain `<View>` (web, page-level scroll) without
 * duplicating the JSX.
 */
function ThreadBody({
  post,
  rootPost,
  parentPost,
  threadLoading,
  threadData,
  borderColor,
  accentColor,
  secondaryText,
  onFocusedPostLayout,
  onLastReplyLayout,
  onReplyPress,
  navigateToPost,
}: ThreadBodyProps) {
  const { t } = useTranslation();
  return (
    <View>
      {rootPost ? (
        <ThreadContextPost post={rootPost} focusedUri={post.uri} navigateToPost={navigateToPost} />
      ) : null}
      {parentPost ? (
        <ThreadContextPost post={parentPost} focusedUri={post.uri} navigateToPost={navigateToPost} />
      ) : null}
      <View onLayout={onFocusedPostLayout}>
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
              labels: post.author.labels,
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
      <Pressable
        style={({ pressed }) => [
          styles.replyBar,
          { borderTopColor: borderColor, borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
          pressed && { opacity: 0.7 },
        ]}
        onPress={onReplyPress}
      >
        <IconSymbol name="arrowshape.turn.up.left" size={18} color={accentColor} />
        <ThemedText style={[styles.replyBarText, { color: secondaryText }]}>
          {t('post.reply')}...
        </ThemedText>
      </Pressable>
      {threadLoading ? (
        <View style={webColumnSideBorders(borderColor)}>
          <FeedSkeleton count={3} />
        </View>
      ) : threadData?.thread?.replies && threadData.thread.replies.length > 0 ? (
        <View style={[styles.repliesContainer, webColumnSideBorders(borderColor)]}>
          <ThemedText style={styles.repliesLabel}>{t('common.replies')}</ThemedText>
          {threadData.thread.replies.map((reply, index) => {
            const isLast = index === threadData.thread!.replies!.length - 1;
            return (
              <View
                key={'post' in reply ? reply.post.uri : `reply-${index}`}
                // last reply's height feeds the scroll-bottom padding
                onLayout={isLast ? onLastReplyLayout : undefined}
              >
                <CommentRow item={reply} navigateToPost={navigateToPost} />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

type PostDetailViewProps = {
  actor: string;
  rKey: string;
};

export default function PostDetailView({ actor, rKey }: PostDetailViewProps) {
  // Mastodon dispatch. The feed builds permalink URLs as
  // `/profile/<acct>/post/<status_id>` where `acct` always contains an
  // `@` for federated handles, matching the same rule `ProfileView`
  // uses. atproto handles never carry `@`, so the discriminator is
  // unambiguous.
  if (actor.includes('@')) {
    return <MastodonStatusDetailView statusId={rKey} />;
  }
  return <AtprotoPostDetailView actor={actor} rKey={rKey} />;
}

function AtprotoPostDetailView({ actor, rKey }: PostDetailViewProps) {
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

  const isWeb = Platform.OS === 'web';

  const handleFocusedPostLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    focusedPostYRef.current = y;
    setFocusedPostHeight(height);
    if (hasUserScrolledRef.current) return;
    if (isWeb) {
      // Page-level scroll on web — match home/profile/messages. The
      // inner ScrollView isn't mounted on web; the document is what
      // scrolls.
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    } else {
      scrollViewRef.current?.scrollTo({ y, animated: false });
    }
  }, [isWeb]);

  const handleLastReplyLayout = useCallback((event: LayoutChangeEvent) => {
    setLastReplyHeight(event.nativeEvent.layout.height);
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    hasUserScrolledRef.current = true;
  }, []);

  // On web, the document scrolls; mark the user-scrolled gate when the
  // window scrolls so subsequent layout fires don't fight the user.
  useEffect(() => {
    if (!isWeb) return;
    const onScroll = () => {
      hasUserScrolledRef.current = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isWeb]);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({}, 'tint');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
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

  const threadBody = (
    <ThreadBody
      post={post}
      rootPost={rootPost}
      parentPost={parentPost}
      threadLoading={threadLoading}
      threadData={threadData}
      borderColor={borderColor}
      accentColor={accentColor}
      secondaryText={secondaryText}
      onFocusedPostLayout={handleFocusedPostLayout}
      onLastReplyLayout={handleLastReplyLayout}
      onReplyPress={() => setShowReplyComposer(true)}
      navigateToPost={navigateToPost}
    />
  );

  return (
    <ThemedView style={isWeb ? webScreenContainer : styles.container}>
      {isWeb ? (
        <View style={[styles.scrollViewContent, styles.scrollViewContentWeb]}>{threadBody}</View>
      ) : (
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
          {threadBody}
        </ScrollView>
      )}

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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  scrollViewContentWeb: {
    // Web uses page-level scroll; no need for headroom at the bottom of
    // the thread, the document grows to fit naturally.
    paddingBottom: 0,
  },
  repliesContainer: {
    // Padding (not margin) so the column side borders extend across the
    // gap above the "Replies" label instead of leaving a gap where the
    // borders would otherwise stop.
    paddingTop: spacing.lg,
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
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
