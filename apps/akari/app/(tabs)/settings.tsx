import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ThemedText } from '@/components/ThemedText';
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
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const palette = {
  background: '#0F1115',
  border: '#1F212D',
  headerBackground: '#151823',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#6B7280',
  highlight: '#7C8CF9',
  activeBackground: '#1E2537',
} as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const scrollViewRef = useRef<ScrollView>(null);

  const switchAccountMutation = useSwitchAccount();
  const removeAccountMutation = useRemoveAccount();
  const wipeAllDataMutation = useWipeAllData();

  // Create scroll to top function
  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  // Register with the tab scroll registry
  useEffect(() => {
    tabScrollRegistry.register('settings', handleScrollToTop);
  }, [handleScrollToTop]);

  // Get profile data for all accounts
  const { data: accountProfiles } = useAccountProfiles();

  const handleLogout = async () => {
    try {
      await wipeAllDataMutation.mutateAsync();
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('common.failedToLogout'),
      });
    }
  };

  const handleSwitchAccount = (account: Account) => {
    if (account.did === currentAccount?.did) return;

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
  };

  const handleRemoveAccount = (account: Account) => {
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
              // If we removed the current account, reload the app
              router.replace('/(tabs)');
            }
          },
        },
      ],
    });
  };

  const dialogManager = useDialogManager();

  const handleAddAccount = () => {
    const closePanel = () => dialogManager.close(ADD_ACCOUNT_PANEL_ID);

    dialogManager.open({
      id: ADD_ACCOUNT_PANEL_ID,
      component: (
        <DialogModal onRequestClose={closePanel}>
          <AddAccountPanel panelId={ADD_ACCOUNT_PANEL_ID} />
        </DialogModal>
      ),
    });
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.headerTitle}>{t('navigation.settings')}</ThemedText>
        </ThemedView>

        {/* Language Section */}
        <ThemedView style={styles.section}>
          <LanguageSelector />
        </ThemedView>

        {/* Notifications Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.notifications')}</ThemedText>
          <NotificationSettings />
        </ThemedView>

        {/* Accounts Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {t('common.accounts')} ({accounts?.length || 0})
          </ThemedText>

          {accounts?.length === 0 && (
            <ThemedView style={[styles.settingItem, styles.settingItemLast]}>
              <ThemedText style={styles.settingValue}>{t('common.noAccounts')}</ThemedText>
            </ThemedView>
          )}

          {accounts?.map((account) => {
            const profile = accountProfiles?.[account.did];
            const avatar = profile?.avatar || account.avatar;
            const displayName = profile?.displayName || account.displayName;

            return (
              <ThemedView key={account.did} style={styles.settingItem}>
                <ThemedView style={styles.accountInfo}>
                  <ThemedView style={styles.accountAvatarContainer}>
                    {avatar ? (
                      <ThemedView style={styles.accountAvatar}>
                        <Image source={{ uri: avatar }} style={styles.accountAvatarImage} contentFit="cover" />
                      </ThemedView>
                    ) : (
                      <ThemedView style={styles.accountAvatarFallback}>
                        <ThemedText style={styles.accountAvatarFallbackText}>
                          {(displayName || account.handle || 'U')[0].toUpperCase()}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>

                  <ThemedView style={styles.accountDetails}>
                    <ThemedText style={styles.accountHandle}>@{account.handle}</ThemedText>
                    {displayName ? <ThemedText style={styles.accountDisplayName}>{displayName}</ThemedText> : null}
                    {account.did === currentAccount?.did ? (
                      <ThemedText style={styles.currentAccountBadge}>{t('common.current')}</ThemedText>
                    ) : null}
                  </ThemedView>

                  <ThemedView style={styles.accountActions}>
                    {account.did !== currentAccount?.did && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleSwitchAccount(account)}>
                        <ThemedText style={styles.actionButtonText}>{t('common.switch')}</ThemedText>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => handleRemoveAccount(account)}
                    >
                      <ThemedText style={styles.removeButtonText}>{t('common.remove')}</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            );
          })}

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} onPress={handleAddAccount}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{t('common.addAccount')}</ThemedText>
              <ThemedText style={styles.settingValue}>{t('common.connectAnotherAccount')}</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* Current Account Section */}
        {currentAccount && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{t('common.currentAccount')}</ThemedText>

            <ThemedView style={styles.settingItem}>
              <ThemedView style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>{t('common.handle')}</ThemedText>
                <ThemedText style={styles.settingValue}>@{currentAccount.handle}</ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.settingItem, styles.settingItemLast]}>
              <ThemedView style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>DID</ThemedText>
                <ThemedText style={styles.settingValue}>{currentAccount.did}</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        )}

        {/* Actions Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('common.actions')}</ThemedText>

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} onPress={handleLogout}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{t('common.disconnectAllAccounts')}</ThemedText>
              <ThemedText style={styles.settingValue}>{t('common.removeAllConnections')}</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* About Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.about')}</ThemedText>

          <ThemedView style={[styles.settingItem, styles.settingItemLast]}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{t('settings.version')}</ThemedText>
              <ThemedText style={styles.settingValue}>{Constants.expoConfig?.version || t('common.unknown')}</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 16,
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: palette.headerBackground,
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  section: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.headerBackground,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textMuted,
    marginBottom: 8,
  },
  settingItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  settingValue: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatarContainer: {
    width: 40,
    height: 40,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
  },
  accountAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: palette.activeBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  accountAvatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  accountDetails: {
    flex: 1,
    gap: 4,
  },
  accountHandle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  accountDisplayName: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  currentAccountBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: palette.highlight,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.highlight,
    backgroundColor: palette.highlight,
  },
  actionButtonText: {
    color: palette.background,
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  removeButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
});
