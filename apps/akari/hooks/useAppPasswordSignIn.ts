import { useState } from 'react';

import { getPdsUrlFromHandle } from '@/bluesky-api';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

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
  const confirm = useConfirm();
  const { data: currentAccount } = useCurrentAccount();
  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);
  // Flips to `true` after the PDS responds with `AuthFactorTokenRequired`.
  // Callers should reveal a token input and pass the entered value into
  // the next `signIn(handle, appPassword, authFactorToken)` call.
  const [requiresAuthFactor, setRequiresAuthFactor] = useState(false);

  const finishSignIn = async (
    handle: string,
    appPassword: string,
    pdsUrl: string,
    authFactorToken: string | undefined,
  ) => {
    const session = await signInMutation.mutateAsync({
      identifier: handle,
      password: appPassword,
      pdsUrl,
      authFactorToken,
    });

    const profile = session.profile;

    const newAccount = await addAccountMutation.mutateAsync({
      did: session.did,
      handle: session.handle,
      displayName: profile?.displayName ?? session.handle,
      avatar: profile?.avatar ?? undefined,
      jwtToken: session.accessJwt,
      refreshToken: session.refreshJwt,
      pdsUrl,
    });

    await switchAccountMutation.mutateAsync(newAccount);
    setRedirectAfterAuth(currentAccount ? '/(tabs)/settings' : '/');
  };

  const isAuthFactorRequiredError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const code = (err as { errorCode?: string; error?: string });
    if (code.errorCode === 'AuthFactorTokenRequired') return true;
    if (code.error === 'AuthFactorTokenRequired') return true;
    return /AuthFactorTokenRequired/.test(err.message);
  };

  const signIn = async (handle: string, appPassword: string, authFactorToken?: string) => {
    if (!handle || !appPassword) {
      confirm({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    if (!validateHandle(handle)) {
      confirm({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(handle);

      if (!detectedPdsUrl) {
        confirm({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
          buttons: [{ text: t('common.ok') }],
        });
        return;
      }

      await finishSignIn(handle, appPassword, detectedPdsUrl, authFactorToken);
      setRequiresAuthFactor(false);
    } catch (error) {
      if (isAuthFactorRequiredError(error)) {
        setRequiresAuthFactor(true);
        if (authFactorToken) {
          // We already tried a token and it was wrong / expired.
          confirm({
            title: t('settings.twoFactorRequiredTitle'),
            message: t('settings.twoFactorInvalidToken'),
            buttons: [{ text: t('common.ok') }],
          });
        }
        return;
      }
      confirm({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  return {
    signIn,
    redirectAfterAuth,
    isLoading: signInMutation.isPending,
    hasCurrentAccount: !!currentAccount,
    requiresAuthFactor,
  };
}
