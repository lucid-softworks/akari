import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
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

  const handleAddAccount = () => {
    // Navigate to sign in with option to add account
    router.push('/(auth)/signin?addAccount=true');
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
            <ThemedView style={styles.settingItem}>
              <ThemedText style={styles.settingValue}>{t('common.noAccounts')}</ThemedText>
            </ThemedView>
          )}

          {accounts?.map((account) => {
            const profile = accountProfiles?.[account.did];
            const avatar = profile?.avatar || account.avatar;
            const displayName = profile?.displayName || account.displayName;

            return (
              <ThemedView key={account.did} style={[styles.settingItem, { borderBottomColor: borderColor }]}>
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

          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: borderColor }]} onPress={handleAddAccount}>
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

            <ThemedView style={styles.settingItem}>
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

          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: borderColor }]} onPress={handleLogout}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{t('common.disconnectAllAccounts')}</ThemedText>
              <ThemedText style={styles.settingValue}>{t('common.removeAllConnections')}</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* About Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.about')}</ThemedText>

          <ThemedView style={styles.settingItem}>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Account for tab bar
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.8,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    opacity: 0.7,
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
  },
  accountAvatarImage: {
    width: 40,
    height: 40,
  },
  accountAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  accountDetails: {
    flex: 1,
    gap: 4,
  },
  accountHandle: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountDisplayName: {
    fontSize: 14,
    opacity: 0.7,
  },
  currentAccountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
