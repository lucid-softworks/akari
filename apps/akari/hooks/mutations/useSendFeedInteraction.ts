import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

export type FeedInteractionEvent =
  | 'app.bsky.feed.defs#interactionRequestLess'
  | 'app.bsky.feed.defs#interactionRequestMore'
  | 'app.bsky.feed.defs#interactionSeen'
  | 'app.bsky.feed.defs#interactionLike'
  | 'app.bsky.feed.defs#interactionRepost'
  | 'app.bsky.feed.defs#interactionReply'
  | 'app.bsky.feed.defs#interactionQuote'
  | 'app.bsky.feed.defs#interactionShare';

/**
 * Sends a "show more / show less" (or other) feed-interaction event to
 * an algorithmic feed generator. Caller passes the feed's at:// URI;
 * we extract the feed gen's DID and proxy through the appview.
 *
 * Mutation is a no-op when `feedUri` doesn't point at a feed
 * generator (e.g. the Following timeline) — those rankings aren't
 * algorithmic, so the lexicon doesn't apply.
 */
export function useSendFeedInteraction() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  return useMutation({
    mutationFn: async ({
      feedUri,
      postUri,
      event,
      feedContext,
    }: {
      feedUri: string;
      postUri: string;
      event: FeedInteractionEvent;
      feedContext?: string;
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      // Feed gen URIs look like `at://<did>/app.bsky.feed.generator/<rkey>`.
      const match = feedUri.match(/^at:\/\/([^\/]+)\/app\.bsky\.feed\.generator\//);
      if (!match) {
        // Not a feed generator (e.g., 'following' for the timeline) —
        // nothing to send.
        return null;
      }
      const feedGenDid = match[1];
      const api = apiForAccount(currentAccount);
      return await api.sendInteractions(token, feedGenDid, [
        feedContext
          ? { event, item: postUri, feedContext }
          : { event, item: postUri },
      ]);
    },
  });
}
