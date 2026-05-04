import { useEffect } from 'react';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { bindOAuthAccount, unbindOAuthAccount } from '@/utils/oauth/clientBinding';

/**
 * Registers a DPoP signer with the bluesky-api client whenever the
 * current account is OAuth-authenticated. The binding is keyed by access
 * token, so account switches and post-refresh token rotations both flow
 * through this single effect (cleanup runs before the new effect).
 *
 * Renders nothing — purely a side-effect component, mounted under the
 * react-query provider so `useCurrentAccount` is available.
 */
export function OAuthAccountBinder() {
  const { data: currentAccount } = useCurrentAccount();
  useEffect(() => {
    if (!currentAccount?.oauth) return;
    bindOAuthAccount(currentAccount);
    return () => unbindOAuthAccount(currentAccount);
  }, [currentAccount?.did, currentAccount?.jwtToken]);
  return null;
}
