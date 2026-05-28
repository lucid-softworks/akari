import { useMutation, useQueryClient } from '@tanstack/react-query';

import { clearLocalVote, recordLocalVote, type PollVotes } from '@/hooks/queries/usePoll';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

type VoteInput = { poll: { uri: string; cid: string }; optionIndex: number };

/**
 * Cast a vote on a poll (`tech.tokimeki.poll.vote`). Optimistically reflects
 * the choice in the tally cache and records it locally so it survives the
 * window before constellation indexes the new vote record.
 */
export function useVotePoll() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ poll, optionIndex }: VoteInput) => {
      if (!token || !currentAccount?.did) throw new Error('Not signed in');
      const api = apiForAccount(currentAccount);
      return api.createPollVote(token, currentAccount.did, { poll, optionIndex });
    },
    onMutate: async ({ poll, optionIndex }: VoteInput) => {
      const did = currentAccount?.did;
      if (!did) return undefined;
      const key = queryKeys.poll.votes(poll.uri, did);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PollVotes>(key);
      recordLocalVote(poll.uri, did, optionIndex);

      const base: PollVotes = previous ?? { counts: [], total: 0, sampled: 0, myOptionIndex: null };
      if (base.myOptionIndex === null) {
        const counts = [...base.counts];
        counts[optionIndex] = (counts[optionIndex] ?? 0) + 1;
        queryClient.setQueryData<PollVotes>(key, {
          counts,
          total: base.total + 1,
          sampled: base.sampled + 1,
          myOptionIndex: optionIndex,
        });
      }
      return { key, previous, did, pollUri: poll.uri };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      clearLocalVote(context.pollUri, context.did);
      queryClient.setQueryData(context.key, context.previous);
    },
  });
}
