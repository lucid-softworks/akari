import React from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateAccountAutomated } from '@/hooks/mutations/useUpdateAccountAutomated';
import {
  isAccountAutomated,
  useProfileRecord,
} from '@/hooks/queries/useProfileRecord';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function AutomationLabelScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const profileRecord = useProfileRecord();
  const update = useUpdateAccountAutomated();
  const automated = isAccountAutomated(profileRecord.data);

  const handleToggle = (next: boolean) => {
    update.mutate(next, {
      onError: () => {
        showToast({ type: 'error', message: t('common.somethingWentWrong') });
      },
    });
  };

  return (
    <SettingsSubpageLayout title={t('settings.automationLabel')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={styles.toggleRow}>
              <IconSymbol color={iconColor} name="cpu" size={20} style={styles.toggleIcon} />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.automationLabel')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.automationLabelHint')}
                </ThemedText>
              </View>
              <Switch
                value={automated}
                onValueChange={handleToggle}
                disabled={profileRecord.isLoading || update.isPending}
              />
            </ThemedView>
          </ThemedView>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleIcon: {
    marginRight: spacing.sm,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleHint: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
