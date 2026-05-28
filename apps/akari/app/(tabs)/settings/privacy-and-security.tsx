import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Menu, MenuTrigger, type MenuItem } from '@/components/ui/Menu';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateLoggedOutVisibility } from '@/hooks/mutations/useUpdateLoggedOutVisibility';
import { useAppPasswords } from '@/hooks/queries/useAppPasswords';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import {
  isLoggedOutVisibilityDiscouraged,
  useProfileRecord,
} from '@/hooks/queries/useProfileRecord';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotifyAudience, type NotifyAudience } from '@/hooks/useNotifyAudience';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useAnalyticsOptOut } from '@/utils/plausible';

export default function PrivacyAndSecurityScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isGuest = useIsGuest();

  const profileRecordQuery = useProfileRecord();
  const updateLoggedOutVisibility = useUpdateLoggedOutVisibility();
  const discourageLoggedOut = isLoggedOutVisibilityDiscouraged(profileRecordQuery.data);
  const appPasswordsQuery = useAppPasswords();
  const appPasswordsCount = appPasswordsQuery.data?.length;
  const { optedOut: analyticsOptedOut, setOptedOut: setAnalyticsOptedOut } = useAnalyticsOptOut();
  const { audience: notifyAudience, setAudience: setNotifyAudience } = useNotifyAudience();

  const notifyAudienceLabel = useMemo(
    () =>
      ({
        anyone: t('settings.notifyOthersAnyone'),
        followers: t('settings.notifyOthersFollowers'),
        mutuals: t('settings.notifyOthersMutuals'),
        'no-one': t('settings.notifyOthersNoOne'),
      })[notifyAudience],
    [notifyAudience, t],
  );

  const notifyAudienceItems = useMemo<MenuItem[]>(
    () =>
      (['anyone', 'followers', 'mutuals', 'no-one'] as const).map((value) => ({
        key: value,
        label: {
          anyone: t('settings.notifyOthersAnyone'),
          followers: t('settings.notifyOthersFollowers'),
          mutuals: t('settings.notifyOthersMutuals'),
          'no-one': t('settings.notifyOthersNoOne'),
        }[value],
        selected: notifyAudience === value,
        onPress: () => setNotifyAudience(value as NotifyAudience),
      })),
    [notifyAudience, setNotifyAudience, t],
  );

  const handleToggleDiscourage = (next: boolean) => {
    updateLoggedOutVisibility.mutate(next, {
      onError: () => {
        showToast({ type: 'error', message: t('common.somethingWentWrong') });
      },
    });
  };

  const privacyRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'two-factor',
        icon: 'lock.shield.fill',
        label: t('settings.twoFactor'),
        value: t('settings.twoFactorEnable'),
        onPress: () => router.push('/(tabs)/settings/two-factor'),
      },
      {
        key: 'app-passwords',
        icon: 'key.fill',
        label: t('settings.appPasswords'),
        value: typeof appPasswordsCount === 'number' ? String(appPasswordsCount) : undefined,
        onPress: () => router.push('/(tabs)/settings/app-passwords'),
      },
    ],
    [appPasswordsCount, showNotImplemented, t],
  );

  if (isGuest) {
    return <GuestSignInRequired title={t('settings.privacyAndSecurity')} />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.privacyAndSecurity')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {privacyRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < privacyRows.length - 1}
                value={item.value}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.notifyOthers')}>
          <ThemedText style={[styles.toggleHint, { color: subduedColor, marginHorizontal: 16 }]}>
            {t('settings.notifyOthersIntro')}
          </ThemedText>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <Menu items={notifyAudienceItems}>
              <MenuTrigger
                style={({ pressed }) => [
                  styles.audienceRow,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol color={iconColor} name="bell.badge.fill" size={20} style={styles.toggleIcon} />
                <ThemedText style={styles.toggleLabel}>{notifyAudienceLabel}</ThemedText>
                <IconSymbol name="chevron.down" size={14} color={subduedColor} />
              </MenuTrigger>
            </Menu>
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.loggedOutVisibility')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol
                color={iconColor}
                name="eye.slash.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.loggedOutVisibilityToggle')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.loggedOutVisibilityDescription')}
                </ThemedText>
              </View>
              <Switch
                value={discourageLoggedOut}
                onValueChange={handleToggleDiscourage}
                disabled={profileRecordQuery.isLoading || updateLoggedOutVisibility.isPending}
              />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <ThemedView style={[styles.noticeCard, { borderColor }]}>
          <ThemedText style={styles.noticeBody}>{t('settings.loggedOutVisibilityNotice')}</ThemedText>
        </ThemedView>

        <SettingsSection title={t('settings.analytics')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol
                color={iconColor}
                name="chart.bar.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.analyticsToggle')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.analyticsDescription')}
                </ThemedText>
              </View>
              <Switch
                value={!analyticsOptedOut}
                onValueChange={(next) => setAnalyticsOptedOut(!next)}
              />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <ThemedView style={[styles.noticeCard, { borderColor }]}>
          <ThemedText style={styles.noticeBody}>{t('settings.analyticsNotice')}</ThemedText>
        </ThemedView>
      </SettingsScroll>
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
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  noticeCard: {
    marginHorizontal: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeBody: {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 20,
  },
});
