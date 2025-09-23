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

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const appearanceRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'color-mode',
        icon: 'circle.lefthalf.filled',
        label: t('settings.colorMode'),
        onPress: showNotImplemented,
      },
      {
        key: 'theme',
        icon: 'paintbrush.fill',
        label: t('settings.theme'),
        onPress: showNotImplemented,
      },
      {
        key: 'font-size',
        icon: 'textformat.size.larger',
        label: t('settings.fontSize'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.appearance')} />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {appearanceRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < appearanceRows.length - 1}
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

