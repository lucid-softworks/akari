import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { getTranslationReport } from '@/utils/translationLogger';

export default function DevelopmentSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();

  const version = Constants.expoConfig?.version ?? t('common.unknown');
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const buildNumber =
    typeof iosBuildNumber === 'string'
      ? iosBuildNumber
      : typeof androidVersionCode === 'number'
        ? String(androidVersionCode)
        : typeof androidVersionCode === 'string'
          ? androidVersionCode
          : undefined;
  const variant =
    typeof Constants.expoConfig?.extra?.variant === 'string'
      ? (Constants.expoConfig.extra?.variant as string)
      : undefined;

  const handleCheckMissingTranslations = useCallback(() => {
    const report = getTranslationReport();

    showAlert({
      title: t('settings.checkMissingTranslations'),
      message: report,
      buttons: [{ text: t('common.ok') }],
    });
  }, [t]);

  const handleOpenDebugTools = useCallback(() => {
    router.push('/debug');
  }, []);

  const developmentRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'check-missing-translations',
        icon: 'sparkles',
        label: t('settings.checkMissingTranslations'),
        onPress: handleCheckMissingTranslations,
      },
      {
        key: 'development-tool',
        icon: 'gearshape.fill',
        label: t('settings.developmentTool'),
        onPress: handleOpenDebugTools,
      },
      {
        key: 'app-variant',
        icon: 'info.circle.fill',
        label: t('settings.appVariant'),
        value: variant ?? t('common.unknown'),
      },
      {
        key: 'version',
        icon: 'number.circle',
        label: t('settings.version'),
        value: version,
      },
      ...(buildNumber
        ? [
            {
              key: 'build-number',
              icon: 'number.circle.fill',
              label: t('settings.buildNumber'),
              value: buildNumber,
            } as SettingsRowDescriptor,
          ]
        : []),
    ],
    [buildNumber, handleCheckMissingTranslations, handleOpenDebugTools, t, variant, version],
  );

  return (
    <SettingsSubpageLayout title={t('settings.development')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {developmentRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < developmentRows.length - 1}
                value={item.value}
              />
            ))}
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
});
