import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DialogModal } from '@/components/ui/DialogModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';
import { getTranslationReport } from '@/utils/translationLogger';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

type IconName = Parameters<typeof IconSymbol>[0]['name'];

type SettingsItem = {
  id: string;
  icon: IconName;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
};

type SettingsSectionDefinition = {
  key: string;
  title: string;
  items: SettingsItem[];
};

type SettingsSectionProps = SettingsSectionDefinition & {
  borderColor: string;
};

const EXTERNAL_LINKS = {
  helpCenter: 'https://help.bsky.app/',
  status: 'https://status.bsky.app/',
  changeLog: 'https://bsky.social/about/changelog',
  feedback: 'https://bsky.social/about/feedback',
  privacy: 'https://bsky.social/about/privacy',
  terms: 'https://bsky.social/about/terms',
} as const;

function SettingsSection({ borderColor, items, title }: SettingsSectionProps) {
  const iconColor = useThemeColor({}, 'text');
  const chevronColor = useThemeColor(
    { light: 'rgba(17, 24, 39, 0.35)', dark: 'rgba(255, 255, 255, 0.35)' },
    'text',
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.onPress ? 0.7 : 1}
              accessibilityRole={item.onPress ? 'button' : 'text'}
              disabled={!item.onPress}
              onPress={item.onPress}
              style={[
                styles.sectionItem,
                { borderBottomColor: borderColor },
                isLast && styles.sectionItemLast,
              ]}
            >
              <IconSymbol name={item.icon} size={20} color={iconColor} style={styles.sectionItemIcon} />

              <ThemedView style={styles.sectionItemContent}>
                <ThemedText style={styles.sectionItemLabel}>{item.label}</ThemedText>
                {item.description ? (
                  <ThemedText
                    darkColor="rgba(255, 255, 255, 0.6)"
                    lightColor="rgba(17, 24, 39, 0.6)"
                    style={styles.sectionItemDescription}
                  >
                    {item.description}
                  </ThemedText>
                ) : null}
              </ThemedView>

              {item.value ? (
                <ThemedText
                  darkColor="rgba(255, 255, 255, 0.75)"
                  lightColor="rgba(17, 24, 39, 0.75)"
                  style={styles.sectionItemValue}
                >
                  {item.value}
                </ThemedText>
              ) : null}

              {item.onPress ? (
                <IconSymbol name="chevron.right" size={18} color={chevronColor} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

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

  const version = Constants.expoConfig?.version ?? t('common.unknown');
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const buildNumber =
    typeof iosBuildNumber === 'string'
      ? iosBuildNumber
      : typeof androidVersionCode === 'number'
        ? String(androidVersionCode)
        : typeof androidVersionCode === 'string'
          ? androidVersionCode
          : undefined;
  const variant =
    typeof Constants.expoConfig?.extra?.variant === 'string'
      ? (Constants.expoConfig.extra?.variant as string)
      : undefined;
  const showDevelopmentSection = __DEV__ || (variant ? variant !== 'production' : false);

  const openExternalLink = useCallback(
    async (url: string) => {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        showAlert({
          title: t('common.error'),
          message: t('common.failedToOpenLink'),
          buttons: [{ text: t('common.ok') }],
        });
      }
    },
    [t],
  );

  const handleCheckMissingTranslations = useCallback(() => {
    const report = getTranslationReport();

    showAlert({
      title: t('settings.checkMissingTranslations'),
      message: report,
      buttons: [{ text: t('common.ok') }],
    });
  }, [t]);

  const handleOpenDebugTools = useCallback(() => {
    router.push('/debug');
  }, []);

  const settingsSections = useMemo<SettingsSectionDefinition[]>(() => {
    const helpSection: SettingsSectionDefinition = {
      key: 'help',
      title: t('settings.help'),
      items: [
        {
          id: 'help-center',
          icon: 'questionmark.circle',
          label: t('settings.helpCenter'),
          onPress: () => openExternalLink(EXTERNAL_LINKS.helpCenter),
        },
      ],
    };

    const aboutItems: SettingsItem[] = [
      {
        id: 'status',
        icon: 'info.circle.fill',
        label: t('settings.status'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.status),
      },
      {
        id: 'change-log',
        icon: 'clock',
        label: t('settings.changeLog'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.changeLog),
      },
      {
        id: 'feedback',
        icon: 'bubble.left',
        label: t('settings.feedback'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.feedback),
      },
      {
        id: 'privacy',
        icon: 'lock.fill',
        label: t('settings.privacy'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.privacy),
      },
      {
        id: 'terms',
        icon: 'doc.text.fill',
        label: t('settings.terms'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.terms),
      },
      {
        id: 'version',
        icon: 'info.circle.fill',
        label: t('settings.version'),
        value: version,
      },
    ];

    if (buildNumber) {
      aboutItems.push({
        id: 'build-number',
        icon: 'info.circle.fill',
        label: t('settings.buildNumber'),
        value: buildNumber,
      });
    }

    const sections: SettingsSectionDefinition[] = [
      helpSection,
      {
        key: 'about',
        title: t('settings.about'),
        items: aboutItems,
      },
    ];

    if (showDevelopmentSection) {
      const developmentItems: SettingsItem[] = [
        {
          id: 'check-missing-translations',
          icon: 'sparkles',
          label: t('settings.checkMissingTranslations'),
          onPress: handleCheckMissingTranslations,
        },
        {
          id: 'development-tool',
          icon: 'gearshape.fill',
          label: t('settings.developmentTool'),
          onPress: handleOpenDebugTools,
        },
      ];

      if (variant) {
        developmentItems.push({
          id: 'app-variant',
          icon: 'info.circle.fill',
          label: t('settings.appVariant'),
          value: variant,
        });
      }

      sections.push({
        key: 'development',
        title: t('settings.development'),
        items: developmentItems,
      });
    }

    return sections;
  }, [
    buildNumber,
    handleCheckMissingTranslations,
    handleOpenDebugTools,
    openExternalLink,
    showDevelopmentSection,
    t,
    variant,
    version,
  ]);

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

        {settingsSections.map((section) => (
          <SettingsSection key={section.key} borderColor={borderColor} items={section.items} title={section.title} />
        ))}
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
  sectionCard: {
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionItemLast: {
    borderBottomWidth: 0,
  },
  sectionItemIcon: {
    marginRight: 12,
  },
  sectionItemContent: {
    flex: 1,
    gap: 4,
  },
  sectionItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionItemDescription: {
    fontSize: 13,
  },
  sectionItemValue: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
});
