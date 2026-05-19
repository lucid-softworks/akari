import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, router } from 'expo-router';

import { spacing } from '@/constants/tokens';
import { AccountDetailsSection } from '@/components/settings/account/AccountDetailsSection';
import { AccountsListSection } from '@/components/settings/account/AccountsListSection';
import { SettingsRowsSection } from '@/components/settings/account/SettingsRowsSection';
import { type SettingsRowDescriptor } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useSession } from '@/hooks/queries/useSession';
import {
  isAccountAutomated,
  useProfileRecord,
} from '@/hooks/queries/useProfileRecord';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';

export default function AccountSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const { data: accountProfiles } = useAccountProfiles();

  const switchAccountMutation = useSwitchAccount();
  const removeAccountMutation = useRemoveAccount();
  const wipeAllDataMutation = useWipeAllData();
  const confirm = useConfirm();
  const sessionQuery = useSession();
  const profileRecord = useProfileRecord();
  const automated = isAccountAutomated(profileRecord.data);
  // After wiping all auth, render <Redirect> rather than calling router
  // imperatively — the imperative router doesn't strip group syntax
  // (`(auth)` ends up as a literal URL segment), but <Redirect> handles
  // cross-navigator-group transitions correctly.
  const [signedOut, setSignedOut] = useState(false);

  const handleSwitchAccount = useCallback(
    (account: Account) => {
      if (account.did === currentAccount?.did) {
        return;
      }

      confirm({
        title: t('common.switchAccount'),
        message: t('profile.switchToAccount', { handle: account.handle }),
        buttons: [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.switch'),
            onPress: () => {
              switchAccountMutation.mutate(account);
            },
          },
        ],
      });
    },
    [confirm, currentAccount, switchAccountMutation, t],
  );

  const handleRemoveAccount = useCallback(
    (account: Account) => {
      confirm({
        title: t('common.removeAccount'),
        message: t('profile.removeAccountConfirmation', { handle: account.handle }),
        buttons: [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: () => {
              removeAccountMutation.mutate(account.did);

              if (account.did === currentAccount?.did) {
                router.replace('/' as never);
              }
            },
          },
        ],
      });
    },
    [confirm, currentAccount?.did, removeAccountMutation, t],
  );

  const handleAddAccount = useCallback(() => {
    router.push('/(tabs)/settings/add-account');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await wipeAllDataMutation.mutateAsync();
      setSignedOut(true);
    } catch {
      confirm({
        title: t('common.error'),
        message: t('common.failedToLogout'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  }, [confirm, t, wipeAllDataMutation]);

  const accountManagementRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'email',
        icon: 'envelope.fill',
        label: t('settings.email'),
        value: sessionQuery.data?.email,
        description:
          sessionQuery.data && sessionQuery.data.emailConfirmed === false
            ? t('settings.emailNotConfirmed')
            : undefined,
      },
      {
        key: 'update-email',
        icon: 'pencil',
        label: t('settings.updateEmail'),
        onPress: () => router.push('/(tabs)/settings/update-email'),
      },
      {
        key: 'password',
        icon: 'lock.fill',
        label: t('settings.password'),
        onPress: () => router.push('/(tabs)/settings/password'),
      },
      {
        key: 'handle',
        icon: 'at',
        label: t('settings.handle'),
        value: currentAccount?.handle ? `@${currentAccount.handle}` : undefined,
        onPress: () => router.push('/(tabs)/settings/handle'),
      },
      {
        key: 'birthday',
        icon: 'calendar',
        label: t('settings.birthday'),
        onPress: () => router.push('/(tabs)/settings/birthday'),
      },
      {
        key: 'automation-label',
        icon: 'cpu',
        label: t('settings.automationLabel'),
        value: automated ? t('settings.automationLabelOn') : t('settings.automationLabelOff'),
        onPress: () => router.push('/(tabs)/settings/automation-label'),
      },
      {
        key: 'export-data',
        icon: 'square.and.arrow.up',
        label: t('settings.exportData'),
        onPress: () => router.push('/(tabs)/settings/export-data'),
      },
    ],
    [automated, currentAccount?.handle, sessionQuery.data, t],
  );

  const dangerRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'deactivate',
        icon: 'moon.zzz.fill',
        label: t('settings.deactivateAccount'),
        onPress: () => router.push('/(tabs)/settings/deactivate-account'),
        destructive: true,
      },
      {
        key: 'delete',
        icon: 'trash.fill',
        label: t('settings.deleteAccount'),
        onPress: () => router.push('/(tabs)/settings/delete-account'),
        destructive: true,
      },
    ],
    [t],
  );

  const actionRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'add-account',
        icon: 'plus',
        label: t('common.addAccount'),
        description: t('common.connectAnotherAccount'),
        onPress: handleAddAccount,
      },
      {
        key: 'disconnect-all',
        icon: 'rectangle.portrait.and.arrow.right',
        label: t('common.signOutAllAccounts'),
        description: t('common.signOutAllAccountsDescription'),
        destructive: true,
        onPress: handleLogout,
      },
    ],
    [handleAddAccount, handleLogout, t],
  );

  if (signedOut) {
    return <Redirect href="/(auth)/signin" />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.account')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <AccountsListSection
          accounts={accounts}
          accountProfiles={accountProfiles}
          currentDid={currentAccount?.did}
          borderColor={borderColor}
          onSwitch={handleSwitchAccount}
          onRemove={handleRemoveAccount}
        />

        {currentAccount ? (
          <AccountDetailsSection
            handle={currentAccount.handle}
            did={currentAccount.did}
            borderColor={borderColor}
          />
        ) : null}

        <SettingsRowsSection title={t('common.actions')} rows={actionRows} borderColor={borderColor} />

        <SettingsRowsSection
          title={t('settings.accountDetails')}
          rows={accountManagementRows}
          borderColor={borderColor}
        />

        <SettingsRowsSection
          title={t('settings.accountSecurity')}
          rows={dangerRows}
          borderColor={borderColor}
        />
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
});
