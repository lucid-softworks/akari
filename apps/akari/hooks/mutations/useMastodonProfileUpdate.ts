import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import type { Account } from '@/types/account';
import { updateMastodonProfile, type UpdateMastodonProfileInput } from '@/utils/mastodon/profile';
import { storage } from '@/utils/secureStorage';

type UpdateInput = Omit<UpdateMastodonProfileInput, 'instanceUrl' | 'accessToken'>;

/**
 * Patches the current Mastodon account's profile and writes the updated
 * `CredentialAccount` through to react-query so the onboarding form's
 * prefill, the home tab's avatar in the bottom nav, and any future
 * profile-screen read all reflect the new values immediately.
 *
 * Mirrors the persisted-account write-through pattern from atproto
 * sign-in: cache + MMKV both get the updated identity fields (display
 * name + avatar URL) so a cold restart sees the new profile.
 */
export function useMastodonProfileUpdate() {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();

  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const instanceUrl = currentAccount?.mastodon?.instanceUrl;
      if (!instanceUrl) throw new Error('Profile update requires a Mastodon account.');
      if (!token) throw new Error('Profile update requires a signed-in session.');
      return await updateMastodonProfile({ ...input, instanceUrl, accessToken: token });
    },
    onSuccess: (updated) => {
      const instanceUrl = currentAccount?.mastodon?.instanceUrl;
      const accountId = currentAccount?.mastodon?.accountId;

      // Cache the fresh CredentialAccount so the onboarding form re-renders
      // with the new values without an extra round-trip.
      queryClient.setQueryData(
        queryKeys.mastodonOwnAccount.forInstance(instanceUrl, accountId),
        updated,
      );

      // Mirror the identity-display fields onto the persisted Account so
      // every other surface (account switcher, sidebar avatar, header bar)
      // picks them up the same way as an atproto profile update would.
      if (!currentAccount) return;
      const refreshedAccount: Account = {
        ...currentAccount,
        displayName: updated.display_name || undefined,
        avatar: updated.avatar || undefined,
      };
      queryClient.setQueryData(queryKeys.currentAccount(), refreshedAccount);
      storage.setItem('currentAccount', refreshedAccount);

      const accountsList =
        queryClient.getQueryData<Account[]>(queryKeys.accounts()) ??
        storage.getItem('accounts') ??
        [];
      const merged = accountsList.map((a) => (a.did === refreshedAccount.did ? refreshedAccount : a));
      queryClient.setQueryData(queryKeys.accounts(), merged);
      storage.setItem('accounts', merged);
    },
  });
}
