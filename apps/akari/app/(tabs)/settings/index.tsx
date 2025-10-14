import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
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
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useSettingsNavigationItems } from '@/hooks/useSettingsNavigationItems';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const EXTERNAL_LINKS = {
  helpCenter: 'https://blueskyweb.zendesk.com/hc/en-us',
  status: 'https://status.bsky.app/',
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

  const handleScrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    tabScrollRegistry.register('settings', handleScrollToTop);
  }, [handleScrollToTop]);

  const navigationItems = useSettingsNavigationItems();

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
    () =>
      navigationItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        onPress: () => router.push(item.route as never),
      })),
    [navigationItems],
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
                onPress={() => router.push('/(tabs)/settings/account')}
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
                accessory={item.accessory}
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
                accessory={item.accessory}
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
                accessory={item.accessory}
              />
            ))}
          </ThemedView>
        </SettingsSection>

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

