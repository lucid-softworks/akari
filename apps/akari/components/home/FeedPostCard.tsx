import React from 'react';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { PostCard } from '@/components/PostCard';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

type FeedPostCardProps = {
  entry: BlueskyFeedItem;
  selectedFeed?: string;
};

export function FeedPostCard({ entry, selectedFeed }: FeedPostCardProps) {
  const navigateToPost = useNavigateToPost();
  const post = entry.post;
  const replyTo = post.reply?.parent
    ? {
        author: {
          handle: post.reply.parent.author?.handle || 'unknown',
          displayName: post.reply.parent.author?.displayName,
        },
        text: post.reply.parent.record?.text as string,
      }
    : undefined;

  return (
    <PostCard
      feedUri={selectedFeed}
      post={{
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
        embeds: post.embeds,
        labels: post.labels,
        viewer: post.viewer,
        facets: (post.record as any)?.facets,
        replyTo,
        uri: post.uri,
        cid: post.cid,
        feedContext: entry.feedContext,
        threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
      }}
      href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
      onPress={() => {
        const uriParts = post.uri.split('/');
        const rKey = uriParts[uriParts.length - 1];
        navigateToPost({ actor: post.author.handle, rKey });
      }}
    />
  );
}
