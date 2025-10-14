import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { AccountRow, InfoRow } from '@/components/settings/AccountComponents';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedView } from '@/components/ThemedView';
import { DialogModal } from '@/components/ui/DialogModal';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';

export default function AccountSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const { data: accountProfiles } = useAccountProfiles();

  const switchAccountMutation = useSwitchAccount();
  const removeAccountMutation = useRemoveAccount();
  const wipeAllDataMutation = useWipeAllData();
  const dialogManager = useDialogManager();
  const showNotImplemented = useNotImplementedToast();

  const handleSwitchAccount = useCallback(
    (account: Account) => {
      if (account.did === currentAccount?.did) {
        return;
      }

      showAlert({
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
    [currentAccount, switchAccountMutation, t],
  );

  const handleRemoveAccount = useCallback(
    (account: Account) => {
      showAlert({
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
                router.replace('/(tabs)');
              }
            },
          },
        ],
      });
    },
    [currentAccount?.did, removeAccountMutation, t],
  );

  const handleAddAccount = useCallback(() => {
    const closePanel = () => dialogManager.close(ADD_ACCOUNT_PANEL_ID);

    dialogManager.open({
      id: ADD_ACCOUNT_PANEL_ID,
      component: (
        <DialogModal onRequestClose={closePanel}>
          <AddAccountPanel panelId={ADD_ACCOUNT_PANEL_ID} />
        </DialogModal>
      ),
    });
  }, [dialogManager]);

  const handleLogout = useCallback(async () => {
    try {
      await wipeAllDataMutation.mutateAsync();
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('common.failedToLogout'),
      });
    }
  }, [t, wipeAllDataMutation]);

  const accountManagementRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'email',
        icon: 'envelope.fill',
        label: t('settings.email'),
        onPress: showNotImplemented,
      },
      {
        key: 'update-email',
        icon: 'pencil',
        label: t('settings.updateEmail'),
        onPress: showNotImplemented,
      },
      {
        key: 'password',
        icon: 'lock.fill',
        label: t('settings.password'),
        onPress: showNotImplemented,
      },
      {
        key: 'birthday',
        icon: 'calendar',
        label: t('settings.birthday'),
        onPress: showNotImplemented,
      },
      {
        key: 'export-data',
        icon: 'square.and.arrow.up',
        label: t('settings.exportData'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  const dangerRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'deactivate',
        icon: 'moon.zzz.fill',
        label: t('settings.deactivateAccount'),
        onPress: showNotImplemented,
        destructive: true,
      },
      {
        key: 'delete',
        icon: 'trash.fill',
        label: t('settings.deleteAccount'),
        onPress: showNotImplemented,
        destructive: true,
      },
    ],
    [showNotImplemented, t],
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
        icon: 'xmark.circle.fill',
        label: t('common.disconnectAllAccounts'),
        description: t('common.removeAllConnections'),
        destructive: true,
        onPress: handleLogout,
      },
    ],
    [handleAddAccount, handleLogout, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.account')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst title={t('common.accounts')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {accounts.length === 0 ? (
              <ThemedView style={styles.emptyState}> 
                <SettingsRow
                  borderColor={borderColor}
                  description={t('common.noAccounts')}
                  icon="person.crop.circle.badge.xmark"
                  label={t('common.accounts')}
                  showDivider={false}
                />
              </ThemedView>
            ) : (
              accounts.map((account) => {
                const profile = accountProfiles?.[account.did];
                const avatar = profile?.avatar || account.avatar;
                const displayName = profile?.displayName || account.displayName;
                const isCurrent = account.did === currentAccount?.did;

                return (
                  <AccountRow
                    key={account.did}
                    account={account}
                    avatar={avatar}
                    borderColor={borderColor}
                    currentLabel={t('common.current')}
                    displayName={displayName}
                    isCurrent={isCurrent}
                    onRemove={() => handleRemoveAccount(account)}
                    onSwitch={
                      isCurrent
                        ? undefined
                        : () => handleSwitchAccount(account)
                    }
                    removeLabel={t('common.remove')}
                    switchLabel={t('common.switch')}
                  />
                );
              })
            )}
          </ThemedView>
        </SettingsSection>

        {currentAccount ? (
          <SettingsSection title={t('settings.accountDetails')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              <InfoRow borderColor={borderColor} label={t('common.handle')} value={`@${currentAccount.handle}`} />
              <InfoRow borderColor={borderColor} label="DID" monospace value={currentAccount.did} />
            </ThemedView>
          </SettingsSection>
        ) : null}

        <SettingsSection title={t('common.actions')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {actionRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                destructive={item.destructive}
                showDivider={index < actionRows.length - 1}
                accessory={item.accessory}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.accountDetails')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {accountManagementRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < accountManagementRows.length - 1}
                accessory={item.accessory}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.accountSecurity')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {dangerRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                destructive={item.destructive}
                showDivider={index < dangerRows.length - 1}
                accessory={item.accessory}
              />
            ))}
          </ThemedView>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  emptyState: {
    borderBottomWidth: 0,
  },
});

