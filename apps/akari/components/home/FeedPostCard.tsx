import React from 'react';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { AtprotoFeedPostCard } from '@/components/home/AtprotoFeedPostCard';
import { MastodonPostCard } from '@/components/home/MastodonPostCard';
import type { MastodonStatus } from '@/utils/mastodon/types';

/**
 * Discriminated-union dispatcher for a single home-feed entry. The list
 * carries items tagged with the protocol they came from; this routes each
 * to the protocol-native renderer so we don't have to coerce two very
 * different data shapes through one component. atproto-specific concerns
 * (reply context, feed gen attribution, content labels) and Mastodon-
 * specific ones (boosts, CW, custom emoji) each stay where they make sense.
 */
export type FeedPostCardProps =
  | { kind: 'atproto'; entry: BlueskyFeedItem; selectedFeed?: string }
  | { kind: 'mastodon'; status: MastodonStatus };

export function FeedPostCard(props: FeedPostCardProps) {
  if (props.kind === 'mastodon') {
    return <MastodonPostCard status={props.status} />;
  }
  return <AtprotoFeedPostCard entry={props.entry} selectedFeed={props.selectedFeed} />;
}
