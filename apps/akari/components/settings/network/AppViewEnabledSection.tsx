import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type AppViewEnabledSectionProps = {
  appViewEnabled: boolean;
  onChange: (enabled: boolean) => void;
  accentColor: string;
  borderColor: string;
  secondaryText: string;
  warningBackground: string;
  warningBorder: string;
  warningText: string;
};

/**
 * Top of the Network settings screen: the master "Use an AppView" toggle
 * with a yellow warning banner that appears when it's off. Extracted from
 * `NetworkSettingsScreen` to keep that screen under the giant-component
 * lint threshold.
 */
export function AppViewEnabledSection({
  appViewEnabled,
  onChange,
  accentColor,
  borderColor,
  secondaryText,
  warningBackground,
  warningBorder,
  warningText,
}: AppViewEnabledSectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection isFirst title={t('settings.appView.enabledSection')}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <ThemedText style={styles.label}>{t('settings.appView.enabledLabel')}</ThemedText>
            <ThemedText style={[styles.description, { color: secondaryText }]}>
              {t('settings.appView.enabledDescription')}
            </ThemedText>
          </View>
          <Switch
            value={appViewEnabled}
            onValueChange={onChange}
            trackColor={{ true: accentColor, false: borderColor }}
          />
        </View>
      </ThemedView>
      {!appViewEnabled ? (
        <View
          style={[styles.warningBanner, { backgroundColor: warningBackground, borderColor: warningBorder }]}
        >
          <ThemedText style={[styles.warningTitle, { color: warningText }]}>
            {t('settings.appView.disabledWarning.title')}
          </ThemedText>
          <ThemedText style={[styles.warningBody, { color: warningText }]}>
            {t('settings.appView.disabledWarning.body')}
          </ThemedText>
        </View>
      ) : null}
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleText: { flex: 1, marginRight: spacing.md },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  warningBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  warningBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
