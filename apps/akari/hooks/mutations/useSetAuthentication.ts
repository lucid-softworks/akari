import { BlueskyApi, type BlueskySession } from '@/bluesky-api';
import type { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const sessionListeners = new Map<string, () => void>();

/**
 * Mutation hook for setting all authentication data at once
 */
export function useSetAuthentication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['setAuthentication'],
    mutationFn: async ({
      token,
      refreshToken,
      did,
      handle,
      pdsUrl,
      active,
      status,
      email,
      emailConfirmed,
      emailAuthFactor,
      displayName,
      avatar,
    }: {
      token: string;
      refreshToken: string;
      did: string;
      handle: string;
      pdsUrl?: string;
      active?: boolean;
      status?: 'takendown' | 'suspended' | 'deactivated';
      email?: string;
      emailConfirmed?: boolean;
      emailAuthFactor?: boolean;
      displayName?: string;
      avatar?: string;
    }) => {
      return {
        token,
        refreshToken,
        did,
        handle,
        pdsUrl,
        active,
        status,
        email,
        emailConfirmed,
        emailAuthFactor,
        displayName,
        avatar,
      };
    },
    onSuccess: async ({
      token,
      refreshToken,
      did,
      handle,
      pdsUrl,
      active,
      status,
      email,
      emailConfirmed,
      emailAuthFactor,
      displayName,
      avatar,
    }) => {
      queryClient.setQueryData(['jwtToken'], token);
      queryClient.setQueryData(['refreshToken'], refreshToken);

      // Create and set the current account
      const previousAccount =
        queryClient.getQueryData<Account>(['currentAccount']) ?? storage.getItem('currentAccount');

      const currentAccount = {
        did,
        handle,
        jwtToken: token,
        refreshToken,
        pdsUrl,
        active,
        status,
        email,
        emailConfirmed,
        emailAuthFactor,
        displayName: displayName ?? previousAccount?.displayName,
        avatar: avatar ?? previousAccount?.avatar,
      };
      queryClient.setQueryData(['currentAccount'], currentAccount);

      // Manually persist the updated queries
      storage.setItem('jwtToken', token);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('currentAccount', currentAccount);

      const cachedAccounts = queryClient.getQueryData<Account[]>(['accounts']);
      const storedAccounts = storage.getItem('accounts');
      const sourceAccounts = cachedAccounts ?? storedAccounts;

      if (sourceAccounts) {
        const nextAccounts = sourceAccounts.map((account) =>
          account.did === did
            ? {
                ...account,
                jwtToken: token,
                refreshToken,
                active,
                status,
                email,
                emailConfirmed,
                emailAuthFactor,
                displayName: displayName ?? account.displayName,
                avatar: avatar ?? account.avatar,
              }
            : account,
        );

        queryClient.setQueryData(['accounts'], nextAccounts);
        storage.setItem('accounts', nextAccounts);
      }

      if (pdsUrl) {
        const api = new BlueskyApi(pdsUrl);

        const session: BlueskySession =
          active === false
            ? {
                handle,
                did,
                accessJwt: token,
                refreshJwt: refreshToken,
                active: false,
                status: status ?? 'deactivated',
                email,
                emailConfirmed,
                emailAuthFactor,
              }
            : {
                handle,
                did,
                accessJwt: token,
                refreshJwt: refreshToken,
                active: true,
                email,
                emailConfirmed,
                emailAuthFactor,
              };

        api.setSession(session);

        const existingListener = sessionListeners.get(pdsUrl);

        if (existingListener) {
          existingListener();
        }

        const unsubscribe = api.onSessionChange((updatedSession) => {
          const updatedAccount: Account = {
            ...currentAccount,
            handle: updatedSession.handle,
            did: updatedSession.did,
            jwtToken: updatedSession.accessJwt,
            refreshToken: updatedSession.refreshJwt,
            active: updatedSession.active,
            status: updatedSession.active ? undefined : updatedSession.status,
            email: updatedSession.email,
            emailConfirmed: updatedSession.emailConfirmed,
            emailAuthFactor: updatedSession.emailAuthFactor,
          };

          queryClient.setQueryData(['jwtToken'], updatedSession.accessJwt);
          queryClient.setQueryData(['refreshToken'], updatedSession.refreshJwt);
          queryClient.setQueryData(['currentAccount'], updatedAccount);

          storage.setItem('jwtToken', updatedSession.accessJwt);
          storage.setItem('refreshToken', updatedSession.refreshJwt);
          storage.setItem('currentAccount', updatedAccount);

          const latestAccounts =
            queryClient.getQueryData<Account[]>(['accounts']) ?? storage.getItem('accounts');

          if (latestAccounts) {
            const mergedAccounts = latestAccounts.map((account) =>
              account.did === updatedAccount.did ? { ...account, ...updatedAccount } : account,
            );

            queryClient.setQueryData(['accounts'], mergedAccounts);
            storage.setItem('accounts', mergedAccounts);
          }
        });

        sessionListeners.set(pdsUrl, unsubscribe);
      }
    },
  });
}
