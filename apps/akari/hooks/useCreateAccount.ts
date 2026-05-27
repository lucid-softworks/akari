import { useState } from 'react';

import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useCreateAccount as useCreateAccountMutation } from '@/hooks/mutations/useCreateAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { SIGNUP_PROVIDERS, type SignupProviderId } from '@/utils/signupProviders';

/**
 * Local-part handles are validated locally before we hit the PDS so the
 * user sees a clear inline error instead of a server bounce. The PDS will
 * still apply its own constraints (length, reserved names, etc.) on top.
 */
const HANDLE_LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const HANDLE_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Custom-PDS branch accepts a full handle (e.g. `me.example.com`) rather
// than a local part. atproto handles are essentially DNS names, so this is
// just a lowercase domain-shape check that lets the PDS do the final ruling.
const FULL_HANDLE_REGEX = /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const PDS_URL_REGEX = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i;

export type CreateAccountInput =
  | {
      provider: Exclude<SignupProviderId, 'custom'>;
      email: string;
      password: string;
      /** Local part only; `handleSuffix` is appended to form the full handle. */
      handle: string;
      /**
       * Domain suffix to issue the handle under (e.g. `.bsky.social`,
       * `.blacksky.app`). Must be one of the chosen provider's known suffixes;
       * the screen is responsible for keeping this in sync when the provider
       * changes.
       */
      handleSuffix: string;
      inviteCode?: string;
    }
  | {
      provider: 'custom';
      email: string;
      password: string;
      /** Full handle including its domain (e.g. `me.example.com`). */
      handle: string;
      /** PDS URL the account will be created on. Must be an https URL. */
      pdsUrl: string;
      inviteCode?: string;
    };

/**
 * Encapsulates the in-app signup flow:
 *   1. validate the form locally,
 *   2. resolve the chosen provider's PDS URL + handle suffix,
 *   3. POST `com.atproto.server.createAccount`,
 *   4. persist the account, and
 *   5. switch to the freshly-created session.
 *
 * Returns a `createAccount` action, the in-flight flag, and the post-auth
 * redirect target the caller hands to `<Redirect />`.
 */
export function useCreateAccount() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data: currentAccount } = useCurrentAccount();
  const createAccountMutation = useCreateAccountMutation();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  const createAccount = async (input: CreateAccountInput) => {
    const trimmedEmail = input.email.trim();
    const trimmedHandle = input.handle.trim().toLowerCase();
    const trimmedInvite = input.inviteCode?.trim();

    if (!trimmedEmail || !input.password || !trimmedHandle) {
      confirm({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      confirm({
        title: t('common.error'),
        message: t('auth.signupInvalidEmail'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    if (input.password.length < PASSWORD_MIN_LENGTH) {
      confirm({
        title: t('common.error'),
        message: t('auth.signupPasswordTooShort'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    let pdsUrl: string;
    let fullHandle: string;

    if (input.provider === 'custom') {
      const trimmedPdsUrl = input.pdsUrl.trim().replace(/\/+$/, '');

      if (!trimmedPdsUrl || !PDS_URL_REGEX.test(trimmedPdsUrl)) {
        confirm({
          title: t('common.error'),
          message: t('auth.signupCustomInvalidPdsUrl'),
          buttons: [{ text: t('common.ok') }],
        });
        return;
      }

      if (!FULL_HANDLE_REGEX.test(trimmedHandle)) {
        confirm({
          title: t('common.error'),
          message: t('auth.signupCustomInvalidHandle'),
          buttons: [{ text: t('common.ok') }],
        });
        return;
      }

      pdsUrl = trimmedPdsUrl;
      fullHandle = trimmedHandle;
    } else {
      if (trimmedHandle.length < HANDLE_MIN_LENGTH) {
        confirm({
          title: t('common.error'),
          message: t('auth.signupHandleTooShort'),
          buttons: [{ text: t('common.ok') }],
        });
        return;
      }

      if (!HANDLE_LOCAL_PART_REGEX.test(trimmedHandle)) {
        confirm({
          title: t('common.error'),
          message: t('auth.signupHandleInvalid'),
          buttons: [{ text: t('common.ok') }],
        });
        return;
      }

      const provider = SIGNUP_PROVIDERS[input.provider];
      pdsUrl = provider.pdsUrl;
      fullHandle = `${trimmedHandle}${input.handleSuffix}`;
    }

    try {
      const session = await createAccountMutation.mutateAsync({
        email: trimmedEmail,
        handle: fullHandle,
        password: input.password,
        inviteCode: trimmedInvite || undefined,
        pdsUrl,
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

      // Land on /(tabs)/settings if the user was already signed in to another
      // account (i.e. they just added a second one), otherwise on home.
      setRedirectAfterAuth(currentAccount ? '/(tabs)/settings' : '/');
    } catch (error) {
      confirm({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signupFailedGeneric'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  return {
    createAccount,
    redirectAfterAuth,
    isLoading: createAccountMutation.isPending,
    hasCurrentAccount: !!currentAccount,
  };
}
