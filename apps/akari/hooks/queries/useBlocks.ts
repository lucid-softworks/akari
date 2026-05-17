import { useInfiniteQuery } from '@tanstack/react-query';

import type { BlueskyBlocksResponse, BlueskyProfile } from '@/bluesky-api';
import { getAuthor, pdsListRecords } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';

type BlockRecord = {
  subject: string;
  createdAt?: string;
};

/**
 * Microcosm-mode hydration of one page of blocks: list `app.bsky.graph.block`
 * records from the user's own repo (block records are stored in the blocker's
 * own repo, not the blockee's, so this is a self-listRecords), then build a
 * `BlueskyProfile` for each subject DID via `getAuthor`. The block record's
 * AT URI is threaded through `viewer.blocking` so the unblock action has the
 * URI it needs to delete.
 */
async function microcosmBlocksPage(args: {
  pdsUrl: string;
  did: string;
  cursor?: string;
  limit: number;
}): Promise<BlueskyBlocksResponse> {
  const page = await pdsListRecords<BlockRecord>({
    pdsUrl: args.pdsUrl,
    repo: args.did,
    collection: 'app.bsky.graph.block',
    limit: args.limit,
    cursor: args.cursor,
  });

  const blocks = await Promise.all(
    page.records.map(async (record): Promise<BlueskyProfile> => {
      const subjectDid = record.value.subject;
      const author = await getAuthor(subjectDid);
      return {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName || undefined,
        avatar: author.avatar || undefined,
        indexedAt: record.value.createdAt ?? new Date(0).toISOString(),
        viewer: { blocking: record.uri },
        labels: [],
      };
    }),
  );

  return { blocks, cursor: page.cursor };
}

/** Paginated list of accounts the current user has blocked. */
export function useBlocks() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery<BlueskyBlocksResponse>({
    queryKey: queryKeys.blocks.list(currentAccount?.did, appViewEnabled),
    enabled:
      !!currentAccount?.pdsUrl && !!currentAccount?.did && (appViewEnabled ? !!token : true),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');

      if (!appViewEnabled) {
        return microcosmBlocksPage({
          pdsUrl: currentAccount.pdsUrl,
          did: currentAccount.did,
          cursor: pageParam as string | undefined,
          limit: 50,
        });
      }

      if (!token) throw new Error('No access token');
      const api = apiForAccount(currentAccount);
      return api.getBlocks(token, 50, pageParam as string | undefined);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}
