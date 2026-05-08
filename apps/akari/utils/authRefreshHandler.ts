import type { QueryClient } from '@tanstack/react-query';

import { setAuthRefreshHandler } from '@/bluesky-api';
import type { Account } from '@/types/account';

import { apiForAccount } from './blueskyApi';
import { refreshOAuthSession } from './oauth/refresh';
import { storage } from './secureStorage';

/**
 * Concurrent 401s for the same access token must share one refresh promise
 * so a parallel notifications + messages refetch on app focus doesn't fan
 * out into two refresh round-trips against the auth server (which would
 * burn a refresh-token rotation and race the second call against the
 * persisted state from the first).
 */
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Wire the bluesky-api client's 401 retry path to the app's refresh logic.
 *
 * On any 401 with `ExpiredToken` / `InvalidToken` / `AuthenticationRequired`,
 * the client calls the handler with the offending access JWT. The handler
 * looks the account up by JWT, runs the OAuth or Bearer refresh dance,
 * mirrors the new tokens across react-query and secureStorage, and returns
 * the rotated access JWT for the client to retry with. A failed refresh
 * (refresh token revoked, network error) clears auth and returns `null`,
 * which makes the original 401 surface to the caller — at which point the
 * per-hook UX falls through to "please sign in again".
 */
export function installAuthRefreshHandler(qc: QueryClient): void {
  setAuthRefreshHandler(async (oldAccessJwt) => {
    const existing = inFlight.get(oldAccessJwt);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const account = findAccountByAccessToken(qc, oldAccessJwt);
        if (!account) return null;

        if (account.oauth) {
          const refreshed = await refreshOAuthSession(account);
          persistRefreshedAccount(qc, refreshed);
          return refreshed.jwtToken;
        }

        if (!account.refreshToken || !account.pdsUrl) return null;
        const api = apiForAccount(account);
        const session = await api.refreshSession(account.refreshToken);
        const refreshed: Account = {
          ...account,
          did: session.did,
          handle: session.handle,
          jwtToken: session.accessJwt,
          refreshToken: session.refreshJwt,
        };
        persistRefreshedAccount(qc, refreshed);
        return refreshed.jwtToken;
      } catch (err) {
        if (__DEV__) {
          console.warn('Auth refresh interceptor failed:', err);
        }
        clearAuth(qc);
        return null;
      } finally {
        inFlight.delete(oldAccessJwt);
      }
    })();

    inFlight.set(oldAccessJwt, promise);
    return promise;
  });
}

function findAccountByAccessToken(qc: QueryClient, token: string): Account | null {
  const current =
    qc.getQueryData<Account>(['currentAccount']) ?? storage.getItem('currentAccount');
  if (current?.jwtToken === token) return current;

  const accounts =
    qc.getQueryData<Account[]>(['accounts']) ?? storage.getItem('accounts') ?? [];
  return accounts.find((a) => a.jwtToken === token) ?? null;
}

function persistRefreshedAccount(qc: QueryClient, refreshed: Account): void {
  qc.setQueryData(['jwtToken'], refreshed.jwtToken);
  qc.setQueryData(['refreshToken'], refreshed.refreshToken);
  qc.setQueryData(['currentAccount'], refreshed);

  const accountsList =
    qc.getQueryData<Account[]>(['accounts']) ?? storage.getItem('accounts') ?? [];
  const updatedAccounts = accountsList.map((a) => (a.did === refreshed.did ? refreshed : a));
  qc.setQueryData(['accounts'], updatedAccounts);

  storage.setItem('jwtToken', refreshed.jwtToken);
  storage.setItem('refreshToken', refreshed.refreshToken);
  storage.setItem('currentAccount', refreshed);
  storage.setItem('accounts', updatedAccounts);
}

function clearAuth(qc: QueryClient): void {
  qc.setQueryData(['jwtToken'], null);
  qc.setQueryData(['refreshToken'], null);
  qc.setQueryData(['currentAccount'], null);
  storage.removeItem('jwtToken');
  storage.removeItem('refreshToken');
  storage.removeItem('currentAccount');
}
