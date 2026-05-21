import Constants from 'expo-constants';
import { Image } from '@/components/Image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountModal } from '@/components/AddAccountModal';
import { useDialogManager } from '@/contexts/DialogContext';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, fontWeight, opacity, activeOpacity } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';
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
  const iconColor = useThemeColor({}, 'text');
  const confirm = useConfirm();

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
        confirm({
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
    const id = 'add-account';
    dialogManager.open({
      id,
      component: <AddAccountModal onClose={() => dialogManager.close(id)} />,
    });
  }, [dialogManager]);

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
        onPress: () => router.push('/(tabs)/settings/account'),
      },
      {
        key: 'privacy-and-security',
        icon: 'lock.fill',
        label: t('settings.privacyAndSecurity'),
        onPress: () => router.push('/(tabs)/settings/privacy-and-security'),
      },
      {
        key: 'notifications',
        icon: 'bell.fill',
        label: t('settings.notifications'),
        onPress: () => router.push('/(tabs)/settings/notifications'),
      },
      {
        key: 'messages',
        icon: 'message.fill',
        label: t('settings.messagesSettings.title'),
        onPress: () => router.push('/(tabs)/settings/messages'),
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
        key: 'moderation',
        icon: 'hand.raised.fill',
        label: t('settings.moderation'),
        onPress: () => router.push('/(tabs)/settings/moderation'),
      },
      {
        key: 'following-cleanup',
        icon: 'sparkles',
        label: t('settings.followingCleanup.title'),
        onPress: () => router.push('/(tabs)/settings/following-cleanup'),
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
      {
        key: 'network',
        icon: 'server.rack',
        label: t('settings.network.title'),
        onPress: () => router.push('/(tabs)/settings/network'),
      },
      {
        key: 'ai',
        icon: 'brain.head.profile',
        label: t('settings.ai.title'),
        onPress: () => router.push('/(tabs)/settings/ai'),
      },
      {
        key: 'accessibility',
        icon: 'figure.wave.circle',
        label: t('settings.accessibility'),
        onPress: () => router.push('/(tabs)/settings/accessibility'),
      },
      {
        key: 'about',
        icon: 'info.circle',
        label: t('settings.about'),
        onPress: () => router.push('/(tabs)/settings/about'),
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

  // Mini avatars for the hero's "Switch account" row. We surface up to
  // five of the *other* accounts on the device so the user can tell at a
  // glance how many sessions are signed in — the row itself is tappable
  // and routes to the accounts manager for actually switching.
  const otherAccounts = (accounts ?? []).filter((a) => a.did !== currentAccount?.did);
  const miniAccounts = otherAccounts.slice(0, 5);

  return (
    <ThemedView style={[Platform.OS === 'web' ? webScreenContainer : styles.container, { paddingTop: isLargeScreen ? insets.top : 0 }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, webColumnSideBorders(borderColor)]}
      >
        {/* Profile hero */}
        <Pressable
          style={({ pressed }) => [styles.hero, pressed && { opacity: activeOpacity.subtle }]}
          onPress={() => router.push('/(tabs)/settings/account')}
        >
          {avatar ? (
            <Image contentFit="cover" source={{ uri: avatar }} style={styles.heroAvatar} />
          ) : (
            <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: accentColor }]}>
              <ThemedText style={styles.heroAvatarFallbackText}>{fallbackLetter}</ThemedText>
            </View>
          )}
          {displayName ? <ThemedText style={styles.heroDisplayName}>{displayName}</ThemedText> : null}
          {currentAccount ? (
            <ThemedText style={[styles.heroHandle, { color: secondaryText }]}>
              @{currentAccount.handle}
            </ThemedText>
          ) : null}
        </Pressable>

        {/* Switch-account row */}
        <View style={styles.switchRow}>
          <Pressable
            style={({ pressed }) => [styles.switchButton, pressed && { opacity: activeOpacity.default }]}
            onPress={handleAddAccount}
          >
            <IconSymbol name="person.2.fill" size={20} color={iconColor} />
            <ThemedText style={styles.switchLabel}>
              {otherAccounts.length > 0 ? t('common.switchAccount') : t('common.addAccount')}
            </ThemedText>
          </Pressable>
          {miniAccounts.length > 0 ? (
            <View style={styles.miniAccounts}>
              {miniAccounts.map((acct, index) => {
                const mini = accountProfiles?.[acct.did];
                const miniAvatar = mini?.avatar ?? acct.avatar;
                const miniLetter = (mini?.displayName ?? acct.handle ?? '?')
                  .charAt(0)
                  .toUpperCase();
                return (
                  <View
                    key={acct.did}
                    style={[
                      styles.miniAvatarWrap,
                      // Stack with a slight overlap, leftmost on top so the
                      // most recent (rightmost) sit underneath — matches the
                      // visual order of the design.
                      { zIndex: miniAccounts.length - index, marginLeft: index === 0 ? 0 : -8 },
                    ]}
                  >
                    {miniAvatar ? (
                      <Image
                        contentFit="cover"
                        source={{ uri: miniAvatar }}
                        style={[styles.miniAvatar, { borderColor: cardBackground }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.miniAvatar,
                          styles.miniAvatarFallback,
                          { backgroundColor: accentColor, borderColor: cardBackground },
                        ]}
                      >
                        <ThemedText style={styles.miniAvatarFallbackText}>{miniLetter}</ThemedText>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

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
            {t('settings.versionFooter', { version: versionDisplay })}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {},
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarFallbackText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  heroDisplayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  heroHandle: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  miniAccounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarWrap: {
    width: 28,
    height: 28,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  miniAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarFallbackText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
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
