/**
 * Thin construction helpers around `BlueskyApi` that thread the user's
 * configured AppView (global default + optional per-account override) into
 * the client's `atproto-proxy` header path.
 *
 * Most call sites in the app build a fresh client per query — using these
 * helpers keeps that pattern but ensures every client honours the AppView
 * picker in settings without each call site needing to re-resolve the
 * config itself.
 */

import { BlueskyApi } from '@/bluesky-api';
import { readAppViewSettings } from '@/hooks/useAppViewSettings';
import type { Account } from '@/types/account';
import { resolveAccountAppView, resolveAppView } from '@/utils/appView';

/**
 * Build a `BlueskyApi` rooted at `account.pdsUrl` with proxy headers wired up
 * for the account's effective AppView (per-account override → global default).
 */
export function apiForAccount(account: Pick<Account, 'pdsUrl' | 'appView'>): BlueskyApi {
  const pdsUrl = account.pdsUrl;
  if (!pdsUrl) {
    throw new Error('apiForAccount: account is missing pdsUrl');
  }
  const { did } = resolveAccountAppView(account, readAppViewSettings());
  return new BlueskyApi(pdsUrl, did);
}

/**
 * Build a `BlueskyApi` rooted at `pdsUrl` using the global AppView default.
 * Use this when the call doesn't have an `Account` in scope (e.g. sign-in
 * flow before the account is persisted).
 */
export function apiForPdsUrl(pdsUrl: string): BlueskyApi {
  const { did } = resolveAppView(readAppViewSettings());
  return new BlueskyApi(pdsUrl, did);
}

/**
 * Build a `BlueskyApi` pointed *directly* at the configured AppView's HTTPS
 * base URL with no proxy header. Use only for unauthenticated public-AppView
 * calls (e.g. trending topics) where there's no PDS to proxy through.
 */
export function apiForPublicAppView(): BlueskyApi {
  const { url } = resolveAppView(readAppViewSettings());
  return new BlueskyApi(url, null);
}
