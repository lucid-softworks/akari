import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { pollEmbedUrlFromRecord } from '@/utils/tokimekiPoll';

type CreatePollInput = {
  /** The post text / poll question. */
  question: string;
  /** 2-4 option labels. */
  options: string[];
  /** ISO timestamp when voting closes. */
  endsAt: string;
  langs?: string[];
};

/**
 * Create a poll: writes the `tech.tokimeki.poll.poll` record, then a post
 * carrying an `app.bsky.embed.external` whose uri is the poll record, so the
 * poll renders inline. (The poll's `subject` back-ref is optional and left
 * unset.)
 */
export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ question, options, endsAt, langs }: CreatePollInput) => {
      if (!token || !currentAccount?.did) throw new Error('Not signed in');
      const api = apiForAccount(currentAccount);

      const poll = await api.createPoll(token, currentAccount.did, { options, endsAt });
      // Attach via Tokimeki's viewer URL so every client (Tokimeki, akari,
      // others) recognises the embed as a poll; the at:// record is
      // reconstructed from this URL when rendering.
      const embedUrl = pollEmbedUrlFromRecord(poll.uri, options.length) ?? poll.uri;
      const post = await api.createPost(token, currentAccount.did, {
        text: question,
        langs,
        externalEmbed: {
          uri: embedUrl,
          title: question || options.slice(0, 2).join(' / '),
          description: options.join(' / '),
        },
      });
      return { poll, post };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}
