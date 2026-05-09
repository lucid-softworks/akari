import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import type { Account } from '@/types/account';
import type { AccountAppViewOverride } from '@/utils/appView';
import { storage } from '@/utils/secureStorage';

type UpdateAccountAppViewVars = {
  did: string;
  /** `undefined` clears the override (account falls back to global default). */
  override: AccountAppViewOverride | undefined;
};

/**
 * Persists a per-account AppView override. Updates both the accounts list
 * and the current-account record so any downstream queries that build
 * `BlueskyApi` instances pick up the new proxy DID on their next run.
 */
export function useUpdateAccountAppView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ did, override }: UpdateAccountAppViewVars) => {
      return { did, override };
    },
    onSuccess: ({ did, override }) => {
      const accounts = (storage.getItem('accounts') ?? []) as Account[];
      const updated = accounts.map((account) =>
        account.did === did
          ? ({ ...account, appView: override } as Account)
          : account,
      );
      storage.setItem('accounts', updated);
      queryClient.setQueryData(queryKeys.accounts(), updated);

      const current = storage.getItem('currentAccount') as Account | null;
      if (current?.did === did) {
        const next: Account = { ...current, appView: override };
        storage.setItem('currentAccount', next);
        queryClient.setQueryData(queryKeys.currentAccount(), next);
      }

      // Account-derived queries (timeline, profile, etc.) build their
      // BlueskyApi from the active account; nudge them so the swap takes
      // effect immediately rather than on next refetch.
      queryClient.invalidateQueries();
    },
  });
}
