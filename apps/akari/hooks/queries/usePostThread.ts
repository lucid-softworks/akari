import { useQuery } from "@tanstack/react-query";

import type { BlueskyFeedItem, BlueskyThreadResponse } from '@/bluesky-api';
import {
  getPostView,
  getReplyUris,
} from '@/hooks/queries/microcosm';
import { useAcceptLabelerDids } from "@/hooks/queries/useAcceptLabelerDids";
import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { useCurrentAccount } from "@/hooks/queries/useCurrentAccount";
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';

const MAX_MICROCOSM_REPLIES = 50;

/**
 * In microcosm mode (AppView disabled) we reconstruct the thread from raw
 * records + constellation backlinks:
 *
 *   1. Slingshot `getRecord` for the focused post.
 *   2. Constellation `getLinks` to find every reply pointing at it.
 *   3. Slingshot per reply (parallel), capped at MAX_MICROCOSM_REPLIES so the
 *      worst-case mega-thread doesn't fan out to thousands of requests.
 *   4. Constellation engagement counts for the focused post and each reply.
 *
 * What you don't get without an AppView: viewer state (`viewer.like` /
 * `viewer.repost`), per-record moderation labels, threadgate enforcement,
 * deeply-nested reply trees (we only fetch one level — the AppView path
 * doesn't paginate replies anyway, so this is a similar slice).
 */
async function microcosmPostThread(postUri: string): Promise<BlueskyThreadResponse> {
  const replyUris = await getReplyUris(postUri, MAX_MICROCOSM_REPLIES);

  const replies = await Promise.all(
    replyUris.map(async (uri): Promise<BlueskyFeedItem | { uri: string; notFound: true }> => {
      try {
        return { post: await getPostView(uri) };
      } catch {
        // The record was probably deleted between constellation indexing the
        // backlink and our fetch. Surface as a notFound stub so the UI can
        // render a placeholder instead of crashing the whole thread.
        return { uri, notFound: true };
      }
    }),
  );

  // Mirror the AppView's chronological reply ordering (oldest first).
  replies.sort((a, b) => {
    const aT = 'post' in a ? (a.post.indexedAt ?? '') : '';
    const bT = 'post' in b ? (b.post.indexedAt ?? '') : '';
    return aT.localeCompare(bT);
  });

  return { thread: { replies } };
}

export function usePostThread(postUri: string | null) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useQuery({
    queryKey: queryKeys.postThread.detail(postUri, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async () => {
      if (!postUri) throw new Error('No post URI');

      if (!appViewEnabled) {
        return microcosmPostThread(postUri);
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error("No PDS URL available");

      const api = apiForAccount(currentAccount);
      return await api.getPostThread(token, postUri, acceptLabelers);
    },
    enabled: !!postUri && (!!token || !appViewEnabled),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
