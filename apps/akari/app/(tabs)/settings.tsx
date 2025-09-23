import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { AccountRow, InfoRow } from '@/components/settings/AccountComponents';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
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
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';
import { showAlert } from '@/utils/alert';
import { getTranslationReport } from '@/utils/translationLogger';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const EXTERNAL_LINKS = {
  helpCenter: 'https://blueskyweb.zendesk.com/hc/en-us',
  status: 'https://status.bsky.app/',
  changeLog: 'https://blueskyweb.xyz/blog',
  feedback: 'https://help.bsky.app/hc/en-us/requests/new',
  privacy: 'https://blueskyweb.xyz/support/privacy-policy',
  terms: 'https://blueskyweb.xyz/support/tos',
} as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const { data: accountProfiles } = useAccountProfiles();
  const scrollViewRef = useRef<ScrollView>(null);

  const switchAccountMutation = useSwitchAccount();
  const removeAccountMutation = useRemoveAccount();
  const wipeAllDataMutation = useWipeAllData();

  const handleScrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    tabScrollRegistry.register('settings', handleScrollToTop);
  }, [handleScrollToTop]);

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
    [currentAccount, removeAccountMutation, t],
  );

  const dialogManager = useDialogManager();

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

  const navigationRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'account',
        icon: 'person.crop.circle',
        label: t('settings.account'),
        onPress: () => router.push('/settings/account'),
      },
      {
        key: 'privacy-security',
        icon: 'lock.fill',
        label: t('settings.privacyAndSecurity'),
        onPress: () => router.push('/settings/privacy-and-security'),
      },
      {
        key: 'moderation',
        icon: 'shield.fill',
        label: t('settings.moderation'),
        onPress: () => router.push('/settings/moderation'),
      },
      {
        key: 'notifications',
        icon: 'bell.fill',
        label: t('settings.notifications'),
        onPress: () => router.push('/settings/notifications'),
      },
      {
        key: 'content-media',
        icon: 'photo.on.rectangle',
        label: t('settings.contentAndMedia'),
        onPress: () => router.push('/settings/content-and-media'),
      },
      {
        key: 'appearance',
        icon: 'paintpalette.fill',
        label: t('settings.appearance'),
        onPress: () => router.push('/settings/appearance'),
      },
      {
        key: 'accessibility',
        icon: 'figure.stand',
        label: t('settings.accessibility'),
        onPress: () => router.push('/settings/accessibility'),
      },
      {
        key: 'languages',
        icon: 'globe',
        label: t('settings.language'),
        onPress: () => router.push('/settings/languages'),
      },
      {
        key: 'about',
        icon: 'info.circle.fill',
        label: t('settings.about'),
        onPress: () => router.push('/settings/about'),
      },
    ],
    [t],
  );

  const supportRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'help-center',
        icon: 'questionmark.circle',
        label: t('settings.help'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.helpCenter),
      },
      {
        key: 'feedback',
        icon: 'bubble.left',
        label: t('settings.feedback'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.feedback),
      },
    ],
    [openExternalLink, t],
  );

  const legalRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'privacy',
        icon: 'lock.fill',
        label: t('settings.privacy'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.privacy),
      },
      {
        key: 'terms',
        icon: 'doc.text.fill',
        label: t('settings.terms'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.terms),
      },
      {
        key: 'status',
        icon: 'waveform.path',
        label: t('settings.status'),
        onPress: () => openExternalLink(EXTERNAL_LINKS.status),
      },
    ],
    [openExternalLink, t],
  );

  const developmentRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'check-missing-translations',
        icon: 'sparkles',
        label: t('settings.checkMissingTranslations'),
        onPress: handleCheckMissingTranslations,
      },
      {
        key: 'development-tool',
        icon: 'gearshape.fill',
        label: t('settings.developmentTool'),
        onPress: handleOpenDebugTools,
      },
      {
        key: 'app-variant',
        icon: 'info.circle.fill',
        label: t('settings.appVariant'),
        value: variant ?? t('common.unknown'),
      },
      {
        key: 'version',
        icon: 'number.circle',
        label: t('settings.version'),
        value: version,
      },
      ...(buildNumber
        ? [
            {
              key: 'build-number',
              icon: 'number.circle.fill',
              label: t('settings.buildNumber'),
              value: buildNumber,
            } as SettingsRowDescriptor,
          ]
        : []),
    ],
    [buildNumber, handleCheckMissingTranslations, handleOpenDebugTools, t, variant, version],
  );

  const currentProfile = currentAccount ? accountProfiles?.[currentAccount.did] : undefined;
  const avatar = currentProfile?.avatar ?? currentAccount?.avatar ?? null;
  const displayName = currentProfile?.displayName ?? currentAccount?.displayName ?? null;
  const fallbackLetter = (displayName || currentAccount?.handle || 'U').charAt(0).toUpperCase();

  const contentPaddingBottom = Math.max(insets.bottom, 24) + 24;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }] }>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}> 
          <ThemedText style={styles.headerTitle}>{t('navigation.settings')}</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.profileCard, { borderColor }]}> 
          <ThemedView style={styles.profileInfo}>
            {avatar ? (
              <Image contentFit="cover" source={{ uri: avatar }} style={styles.profileAvatar} />
            ) : (
              <ThemedView style={styles.profileAvatarFallback}>
                <ThemedText style={styles.profileAvatarFallbackText}>{fallbackLetter}</ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.profileDetails}>
              {displayName ? <ThemedText style={styles.profileDisplayName}>{displayName}</ThemedText> : null}
              {currentAccount ? <ThemedText style={styles.profileHandle}>@{currentAccount.handle}</ThemedText> : null}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.profileActions}>
            {accounts.length > 1 ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={() => router.push('/settings/account')}
                style={[styles.primaryActionButton, styles.profileActionButton]}
              >
                <ThemedText style={styles.primaryActionText}>{t('common.switchAccount')}</ThemedText>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={handleAddAccount}
              style={[styles.secondaryActionButton, styles.profileActionButton]}
            >
              <ThemedText style={styles.secondaryActionText}>{t('common.addAccount')}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <SettingsSection isFirst title={t('navigation.settings')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {navigationRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < navigationRows.length - 1}
                value={item.value}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.support')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {supportRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < supportRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.legal')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {legalRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < legalRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('common.actions')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            <SettingsRow
              borderColor={borderColor}
              destructive
              icon="xmark.circle.fill"
              label={t('settings.signOut')}
              onPress={handleLogout}
              showDivider={false}
            />
          </ThemedView>
        </SettingsSection>

        {showDevelopmentSection ? (
          <SettingsSection title={t('settings.development')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              {developmentRows.map((item, index) => (
                <SettingsRow
                  key={item.key}
                  borderColor={borderColor}
                  description={item.description}
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress}
                  showDivider={index < developmentRows.length - 1}
                  value={item.value}
                />
              ))}
            </ThemedView>
          </SettingsSection>
        ) : null}

        {currentAccount ? (
          <SettingsSection title={t('common.accounts')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              <InfoRow borderColor={borderColor} label={t('common.handle')} value={`@${currentAccount.handle}`} />
              <InfoRow borderColor={borderColor} label="DID" monospace value={currentAccount.did} />
            </ThemedView>

            <ThemedView style={[styles.sectionCard, { borderColor }]}> 
              {accounts.length === 0 ? null : (
                accounts.map((account) => {
                  const profile = accountProfiles?.[account.did];
                  const accountAvatar = profile?.avatar || account.avatar;
                  const accountDisplayName = profile?.displayName || account.displayName;
                  const isCurrent = account.did === currentAccount.did;

                  return (
                    <AccountRow
                      key={account.did}
                      account={account}
                      avatar={accountAvatar}
                      borderColor={borderColor}
                      currentLabel={t('common.current')}
                      displayName={accountDisplayName}
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
        ) : null}
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
    paddingBottom: 48,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  profileAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarFallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileDisplayName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileHandle: {
    fontSize: 15,
    opacity: 0.7,
    marginTop: 4,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  profileActionButton: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryActionButton: {
    borderColor: 'transparent',
    backgroundColor: '#007AFF',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionButton: {
    borderColor: 'rgba(124, 140, 249, 0.4)',
    backgroundColor: 'transparent',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

