import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getPollRecord, getPollVotes } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { queryKeys } from '@/hooks/queryKeys';

/**
 * Fetch a `tech.tokimeki.poll.poll` record by its at:// URI (the value sits
 * in a post's external embed). Public read — works logged out.
 */
export function usePoll(pollUri: string | undefined) {
  return useQuery({
    queryKey: queryKeys.poll.detail(pollUri),
    queryFn: () => {
      if (!pollUri) throw new Error('No poll URI provided');
      return getPollRecord(pollUri);
    },
    enabled: !!pollUri,
    staleTime: 5 * 60 * 1000,
  });
}

export type PollVotes = {
  /** Vote count per option index. */
  counts: number[];
  /** Exact total across the network (from the link count). */
  total: number;
  /** How many votes were actually sampled for the per-option breakdown. */
  sampled: number;
  /** The viewer's chosen option, if they've voted (within the sample). */
  myOptionIndex: number | null;
};

// Votes the viewer cast this session, keyed by `${did}:${pollUri}`.
// Constellation indexes new votes asynchronously (often minutes), so a tally
// refetch right after voting won't see the viewer's own vote — we overlay it
// from here until the network catches up.
const localVotes = new Map<string, number>();

export function recordLocalVote(pollUri: string, did: string, optionIndex: number): void {
  localVotes.set(`${did}:${pollUri}`, optionIndex);
}

export function clearLocalVote(pollUri: string, did: string): void {
  localVotes.delete(`${did}:${pollUri}`);
}

/**
 * Tally a poll's votes. Gated by `enabled` so the (heavier) cross-network
 * fetch only runs when results are actually shown — after the viewer votes
 * or once the poll closes.
 */
export function usePollVotes(pollUri: string | undefined, enabled: boolean = true) {
  const { data: currentAccount } = useCurrentAccount();
  const viewerDid = currentAccount?.did;

  return useQuery({
    queryKey: queryKeys.poll.votes(pollUri, viewerDid),
    queryFn: async (): Promise<PollVotes> => {
      if (!pollUri) throw new Error('No poll URI provided');
      const { voters } = await getPollVotes(pollUri);

      // One vote per account (last seen wins) so a re-vote doesn't
      // double-count.
      const byDid = new Map<string, number>();
      for (const vote of voters) byDid.set(vote.did, vote.optionIndex);

      // Overlay the viewer's just-cast vote — constellation indexes it
      // asynchronously, so the network fetch won't include it yet.
      const localVote = viewerDid ? localVotes.get(`${viewerDid}:${pollUri}`) : undefined;
      if (viewerDid && localVote !== undefined) byDid.set(viewerDid, localVote);

      const counts: number[] = [];
      for (const optionIndex of byDid.values()) {
        counts[optionIndex] = (counts[optionIndex] ?? 0) + 1;
      }
      return {
        counts,
        total: byDid.size,
        sampled: byDid.size,
        myOptionIndex: viewerDid ? byDid.get(viewerDid) ?? null : null,
      };
    },
    enabled: !!pollUri && enabled,
    staleTime: 60 * 1000,
  });
}

/** Whether a poll's `endsAt` is in the past. */
export function useIsPollClosed(endsAt: string | undefined): boolean {
  return useMemo(() => {
    if (!endsAt) return false;
    const ts = Date.parse(endsAt);
    return !Number.isNaN(ts) && ts <= Date.now();
  }, [endsAt]);
}
