import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccessibilitySettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const accessibilityRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'require-alt-text',
        icon: 'text.bubble',
        label: t('settings.requireAltText'),
        onPress: showNotImplemented,
      },
      {
        key: 'display-larger-text',
        icon: 'textformat.size',
        label: t('settings.displayLargerTextBadges'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.accessibility')} />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {accessibilityRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < accessibilityRows.length - 1}
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
  contentContainer: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});

