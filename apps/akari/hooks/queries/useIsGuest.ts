import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

/**
 * `true` when no account is signed in. Guest users can browse public
 * AppView reads (feeds, profiles, search, post threads) but every write
 * surface and auth-only read (notifications, DMs, bookmarks, prefs)
 * must gate on this and either hide the affordance or route the user
 * to `/(auth)/signin`.
 *
 * We key off both `currentAccount` and `jwtToken` so a partially-torn-
 * down session (e.g. account record cleared but token still hanging in
 * react-query during sign-out) still resolves as guest immediately.
 */
export function useIsGuest(): boolean {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  return !currentAccount || !token;
}
