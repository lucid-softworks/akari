import React from 'react';

import type { BlueskyEmbed, BlueskyFeedItem, BlueskyPostView } from '@/bluesky-api';
import { PostCard, type PostCardProps } from '@/components/PostCard';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

type AtprotoFeedPostCardProps = {
  entry: BlueskyFeedItem;
  selectedFeed?: string;
};

/**
 * Build the `PostCard.post` payload from a `BlueskyPostView`. Shared by
 * the reply renderer below and the main feed entry so the parent and
 * child cards stay in lock-step on how each field is mapped.
 */
function buildPostCardPost(post: BlueskyPostView): PostCardProps['post'] {
  const replyRef = (post.record as { reply?: { root?: { uri?: string } } } | undefined)?.reply;
  const inlineReplyTo = post.reply?.parent
    ? {
        author: {
          handle: post.reply.parent.author?.handle || 'unknown',
          displayName: post.reply.parent.author?.displayName,
        },
        text: post.reply.parent.record?.text as string,
      }
    : undefined;

  return {
    id: post.uri,
    text: post.record?.text as string,
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
    embeds: post.embeds as BlueskyEmbed[] | undefined,
    labels: post.labels,
    viewer: post.viewer,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    facets: (post.record as any)?.facets,
    replyTo: inlineReplyTo,
    uri: post.uri,
    cid: post.cid,
    threadRootUri: replyRef?.root?.uri,
  };
}

/**
 * `notFoundPost` / `blockedPost` stubs come back through the AppView
 * when the upstream reply target has been deleted or has blocked the
 * viewer. They lack `author` / `record`, so we have to recognise the
 * stub shape before trying to render them as a real card. A stripped-
 * down placeholder is rendered upstream by the feed; here we just
 * decide whether the parent view is rich enough to PostCard-render.
 */
function isRenderablePost(view: unknown): view is BlueskyPostView {
  if (!view || typeof view !== 'object') return false;
  const v = view as { author?: unknown; record?: unknown; $type?: string };
  if (v.$type === 'app.bsky.feed.defs#notFoundPost') return false;
  if (v.$type === 'app.bsky.feed.defs#blockedPost') return false;
  return Boolean(v.author) && Boolean(v.record);
}

export function AtprotoFeedPostCard({ entry, selectedFeed }: AtprotoFeedPostCardProps) {
  const navigateToPost = useNavigateToPost();
  const post = entry.post;

  // The feed-item-level reply ref carries the full parent post view
  // (per `app.bsky.feed.defs#replyRef`). When it's a real post — not
  // a notFound / blocked stub — we render it inline above the child
  // so the conversation context is visible without tapping through.
  const parent = entry.reply?.parent;
  const parentRenderable = isRenderablePost(parent);

  const renderChild = (
    <PostCard
      feedUri={selectedFeed}
      post={{
        ...buildPostCardPost(post),
        feedContext: entry.feedContext,
      }}
      href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
      onPress={() => {
        const uriParts = post.uri.split('/');
        const rKey = uriParts[uriParts.length - 1];
        navigateToPost({ actor: post.author.handle, rKey });
      }}
      // The parent above already shows who the reply is to (its
      // PostHeader carries the author row), so we suppress the small
      // "Replying to @handle" snippet on the child — keeping it would
      // double up the context for the user.
      hideReplyContext={parentRenderable}
      connectsTop={parentRenderable}
    />
  );

  if (!parentRenderable) return renderChild;

  const parentPost = parent!;
  const parentRkey = parentPost.uri.split('/').pop();

  return (
    <>
      <PostCard
        feedUri={selectedFeed}
        post={buildPostCardPost(parentPost)}
        href={`/profile/${parentPost.author.handle}/post/${parentRkey}`}
        onPress={() => {
          if (!parentRkey) return;
          navigateToPost({ actor: parentPost.author.handle, rKey: parentRkey });
        }}
        connectsBottom
        // Drop the divider between parent and child so the thread
        // line flows uninterrupted across them.
        hideBottomBorder
      />
      {renderChild}
    </>
  );
}
