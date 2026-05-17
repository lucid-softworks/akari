import { useState } from 'react';

import { getPdsUrlFromHandle } from '@/bluesky-api';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

const HANDLE_REGEX = /^@?[a-zA-Z0-9._-]+$/;

const validateHandle = (value: string): boolean => HANDLE_REGEX.test(value.replace('.bsky.social', ''));

/**
 * Encapsulates the legacy app-password sign-in flow:
 *   1. validate handle,
 *   2. resolve handle to a PDS URL,
 *   3. exchange handle + app-password for a session,
 *   4. persist the account, and
 *   5. switch the active account.
 *
 * Returns a `signIn` action, the in-flight flag, and the post-auth redirect
 * target the caller should hand to `<Redirect />`.
 */
export function useAppPasswordSignIn() {
  const { t } = useTranslation();
  const { data: currentAccount } = useCurrentAccount();
  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  const signIn = async (handle: string, appPassword: string) => {
    if (!handle || !appPassword) {
      showAlert({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
      });
      return;
    }

    if (!validateHandle(handle)) {
      showAlert({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(handle);

      if (!detectedPdsUrl) {
        showAlert({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
        });
        return;
      }

      const session = await signInMutation.mutateAsync({
        identifier: handle,
        password: appPassword,
        pdsUrl: detectedPdsUrl,
      });

      const profile = session.profile;

      const newAccount = await addAccountMutation.mutateAsync({
        did: session.did,
        handle: session.handle,
        displayName: profile?.displayName ?? session.handle,
        avatar: profile?.avatar ?? undefined,
        jwtToken: session.accessJwt,
        refreshToken: session.refreshJwt,
        pdsUrl: detectedPdsUrl,
      });

      await switchAccountMutation.mutateAsync(newAccount);

      setRedirectAfterAuth(currentAccount ? '/(tabs)/settings' : '/');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    }
  };

  return {
    signIn,
    redirectAfterAuth,
    isLoading: signInMutation.isPending,
    hasCurrentAccount: !!currentAccount,
  };
}
