import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { followMastodonAccount, unfollowMastodonAccount } from '@/utils/mastodon/follow';
import type { MastodonRelationship } from '@/utils/mastodon/types';

type FollowInput = {
  accountId: string;
  /**
   * `true` to follow, `false` to unfollow. Keeping a single mutation
   * instead of two avoids having to pick the right hook at the call site —
   * the onboarding row just flips this when the user taps the toggle.
   */
  follow: boolean;
};

/**
 * Follow / unfollow a Mastodon account. Returns the resulting
 * `Relationship` so callers can drive UI from the post-action truth —
 * locked accounts in particular respond with `requested: true` rather
 * than `following: true`, and we want the button to reflect that.
 *
 * No cache write-through: the only caller right now is the onboarding
 * screen, which tracks its own per-row state from the mutation result.
 * When we add a profile screen and a relationships query later, this can
 * grow an `onSuccess` that invalidates that key.
 */
export function useMastodonFollow() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();

  return useMutation<MastodonRelationship, Error, FollowInput>({
    mutationFn: async ({ accountId, follow }) => {
      const instanceUrl = currentAccount?.mastodon?.instanceUrl;
      if (!instanceUrl) throw new Error('Follow requires a Mastodon account.');
      if (!token) throw new Error('Follow requires a signed-in session.');
      const fn = follow ? followMastodonAccount : unfollowMastodonAccount;
      return await fn({ instanceUrl, accessToken: token, accountId });
    },
  });
}
