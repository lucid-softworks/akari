import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';
import { showAlert } from '@/utils/alert';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const EXTERNAL_LINKS = {
  helpCenter: 'https://blueskyweb.zendesk.com/hc/en-us',
  status: 'https://status.bsky.app/',
  feedback: 'https://help.bsky.app/hc/en-us/requests/new',
  privacy: 'https://blueskyweb.xyz/support/privacy-policy',
  terms: 'https://blueskyweb.xyz/support/tos',
  changeLog: 'https://blueskyweb.xyz/blog',
} as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const { data: accountProfiles } = useAccountProfiles();
  const scrollViewRef = useRef<ScrollView>(null);
  const { isLargeScreen } = useResponsive();

  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const handleScrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    tabScrollRegistry.register('settings', handleScrollToTop);
  }, [handleScrollToTop]);

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

  const handleAddAccount = useCallback(() => {
    router.push('/(tabs)/settings/add-account');
  }, [router]);

  // Version info
  const version = Constants.expoConfig?.version ?? t('common.unknown');
  const extra = Constants.expoConfig?.extra as { buildMetadata?: { commitSha?: string | null } } | undefined;
  const commitSha = typeof extra?.buildMetadata?.commitSha === 'string' && extra.buildMetadata.commitSha.length > 0
    ? extra.buildMetadata.commitSha.slice(0, 7) : undefined;
  const versionDisplay = commitSha ? `${version} (${commitSha})` : version;

  // Show dev section?
  const variant = typeof Constants.expoConfig?.extra?.variant === 'string'
    ? (Constants.expoConfig.extra?.variant as string) : undefined;
  const showDev = __DEV__ || (variant ? variant !== 'production' : false);

  // Settings rows
  const settingsRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'account',
        icon: 'person.crop.circle',
        label: t('settings.account'),
        description: t('settings.accountDescription'),
        onPress: () => router.push('/(tabs)/settings/account'),
      },
      {
        key: 'notifications',
        icon: 'bell.fill',
        label: t('settings.notifications'),
        onPress: () => router.push('/(tabs)/settings/notifications'),
      },
      {
        key: 'customize-tabs',
        icon: 'square.grid.2x2',
        label: t('settings.customizeTabs'),
        onPress: () => router.push('/(tabs)/settings/customize-tabs'),
      },
      {
        key: 'content-and-media',
        icon: 'photo.on.rectangle',
        label: t('settings.contentAndMedia'),
        onPress: () => router.push('/(tabs)/settings/content-and-media'),
      },
      {
        key: 'appearance',
        icon: 'paintbrush.fill',
        label: t('settings.appearance'),
        onPress: () => router.push('/(tabs)/settings/appearance'),
      },
      {
        key: 'languages',
        icon: 'globe',
        label: t('settings.language'),
        onPress: () => router.push('/(tabs)/settings/languages'),
      },
    ],
    [t],
  );

  const linksRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      { key: 'help', icon: 'questionmark.circle', label: t('settings.help'), onPress: () => openExternalLink(EXTERNAL_LINKS.helpCenter) },
      { key: 'feedback', icon: 'bubble.left', label: t('settings.feedback'), onPress: () => openExternalLink(EXTERNAL_LINKS.feedback) },
      { key: 'changelog', icon: 'clock.fill', label: t('settings.changeLog'), onPress: () => openExternalLink(EXTERNAL_LINKS.changeLog) },
      { key: 'privacy', icon: 'lock.fill', label: t('settings.privacy'), onPress: () => openExternalLink(EXTERNAL_LINKS.privacy) },
      { key: 'terms', icon: 'doc.text.fill', label: t('settings.terms'), onPress: () => openExternalLink(EXTERNAL_LINKS.terms) },
      { key: 'status', icon: 'waveform.path', label: t('settings.status'), onPress: () => openExternalLink(EXTERNAL_LINKS.status) },
    ],
    [openExternalLink, t],
  );

  const devRows = useMemo<SettingsRowDescriptor[]>(
    () => showDev
      ? [
          { key: 'development', icon: 'hammer.fill', label: t('settings.development'), onPress: () => router.push('/(tabs)/settings/development') },
        ]
      : [],
    [showDev, t],
  );

  const currentProfile = currentAccount ? accountProfiles?.[currentAccount.did] : undefined;
  const avatar = currentProfile?.avatar ?? currentAccount?.avatar ?? null;
  const displayName = currentProfile?.displayName ?? currentAccount?.displayName ?? null;
  const fallbackLetter = (displayName || currentAccount?.handle || 'U').charAt(0).toUpperCase();

  return (
    <ThemedView style={[styles.container, { paddingTop: isLargeScreen ? insets.top : 0 }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: cardBackground, borderColor }]}
          onPress={() => router.push('/(tabs)/settings/account')}
          activeOpacity={activeOpacity.subtle}
        >
          <View style={styles.profileRow}>
            {avatar ? (
              <Image contentFit="cover" source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: accentColor }]}>
                <ThemedText style={styles.avatarFallbackText}>{fallbackLetter}</ThemedText>
              </View>
            )}
            <View style={styles.profileInfo}>
              {displayName ? <ThemedText style={styles.displayName}>{displayName}</ThemedText> : null}
              {currentAccount ? (
                <ThemedText style={[styles.handle, { color: secondaryText }]}>@{currentAccount.handle}</ThemedText>
              ) : null}
            </View>
            <IconSymbol name="chevron.right" size={16} color={secondaryText} />
          </View>

          {accounts && accounts.length > 1 ? (
            <View style={styles.accountBadge}>
              <ThemedText style={[styles.accountBadgeText, { color: secondaryText }]}>
                {accounts.length} {t('common.accounts').toLowerCase()}
              </ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Add Account */}
        <TouchableOpacity
          style={[styles.addAccountButton, { borderColor }]}
          onPress={handleAddAccount}
          activeOpacity={activeOpacity.default}
        >
          <IconSymbol name="plus.circle.fill" size={20} color={accentColor} />
          <ThemedText style={[styles.addAccountText, { color: accentColor }]}>{t('common.addAccount')}</ThemedText>
        </TouchableOpacity>

        {/* Settings */}
        <SettingsSection isFirst title={t('navigation.settings')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {settingsRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                description={item.description}
                onPress={item.onPress}
                showDivider={index < settingsRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        {/* Links & Info */}
        <SettingsSection title={t('settings.support')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {linksRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < linksRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        {/* Dev (conditional) */}
        {devRows.length > 0 ? (
          <SettingsSection title={t('settings.development')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              {devRows.map((item, index) => (
                <SettingsRow
                  key={item.key}
                  borderColor={borderColor}
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress}
                  showDivider={index < devRows.length - 1}
                />
              ))}
            </ThemedView>
          </SettingsSection>
        ) : null}

        {/* Version footer */}
        <View style={styles.versionFooter}>
          <ThemedText style={[styles.versionText, { color: secondaryText }]}>
            Akari {versionDisplay}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {},
  profileCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarFallbackText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.base,
    marginTop: spacing.xxs,
  },
  accountBadge: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: layout.hairline,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  accountBadgeText: {
    fontSize: fontSize.sm,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  addAccountText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  versionText: {
    fontSize: fontSize.sm,
    opacity: opacity.tertiary,
  },
});
