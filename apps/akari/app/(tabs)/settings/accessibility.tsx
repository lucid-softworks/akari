import React from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccessibilitySettingsScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const {
    requireAltText,
    setRequireAltText,
    largerTextBadges,
    setLargerTextBadges,
    largerAltTextBadges,
    setLargerAltTextBadges,
  } = useAccessibilitySettings();

  return (
    <SettingsSubpageLayout title={t('settings.accessibility')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst title={t('settings.altText')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={[styles.toggleRow, { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <IconSymbol
                color={iconColor}
                name="text.bubble"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.requireAltText')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.requireAltTextHint')}
                </ThemedText>
              </View>
              <Switch value={requireAltText} onValueChange={setRequireAltText} />
            </ThemedView>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol
                color={iconColor}
                name="eye.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.displayLargerAltTextBadges')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.displayLargerAltTextBadgesHint')}
                </ThemedText>
              </View>
              <Switch value={largerAltTextBadges} onValueChange={setLargerAltTextBadges} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol
                color={iconColor}
                name="textformat.size"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.displayLargerTextBadges')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.displayLargerTextBadgesHint')}
                </ThemedText>
              </View>
              <Switch value={largerTextBadges} onValueChange={setLargerTextBadges} />
            </ThemedView>
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
