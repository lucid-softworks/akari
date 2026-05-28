import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useMessagesSettings } from '@/hooks/useMessagesSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function MessagesSettingsScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const isGuest = useIsGuest();
  const { hideDeletedAccounts, setHideDeletedAccounts } = useMessagesSettings();

  if (isGuest) {
    return <GuestSignInRequired title={t('settings.messagesSettings.title')} />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.messagesSettings.title')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst title={t('settings.messagesSettings.filtersSection')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol color={iconColor} name="person.slash.fill" size={20} style={styles.toggleIcon} />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.messagesSettings.hideDeletedAccounts')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.messagesSettings.hideDeletedAccountsHint')}
                </ThemedText>
              </View>
              <Switch value={hideDeletedAccounts} onValueChange={setHideDeletedAccounts} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>
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
});
