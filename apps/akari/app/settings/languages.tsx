import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { LanguageSelector } from '@/components/LanguageSelector';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function LanguagesSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const languageRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'content-languages',
        icon: 'globe',
        label: t('settings.contentLanguages'),
        description: t('settings.notImplemented'),
        onPress: showNotImplemented,
      },
    ],
    [showNotImplemented, t],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor, overflow: 'hidden' }]}> 
            <LanguageSelector />
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('common.actions')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}> 
            {languageRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < languageRows.length - 1}
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

