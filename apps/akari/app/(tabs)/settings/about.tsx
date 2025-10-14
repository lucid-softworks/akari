import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
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
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

const LINKS = {
  terms: 'https://blueskyweb.xyz/support/tos',
  privacy: 'https://blueskyweb.xyz/support/privacy-policy',
  status: 'https://status.bsky.app/',
  changeLog: 'https://blueskyweb.xyz/blog',
} as const;

export default function AboutSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();

  const version = Constants.expoConfig?.version ?? t('common.unknown');
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const extra = Constants.expoConfig?.extra as
    | {
        buildMetadata?: {
          commitSha?: string | null;
        };
      }
    | undefined;
  const commitSha =
    typeof extra?.buildMetadata?.commitSha === 'string' && extra.buildMetadata.commitSha.length > 0
      ? extra.buildMetadata.commitSha
      : undefined;
  const shortCommitSha = commitSha?.slice(0, 7);
  const versionDisplay = useMemo(
    () => (shortCommitSha ? `${version} (${shortCommitSha})` : version),
    [shortCommitSha, version],
  );
  const buildNumber =
    typeof iosBuildNumber === 'string'
      ? iosBuildNumber
      : typeof androidVersionCode === 'number'
        ? String(androidVersionCode)
        : typeof androidVersionCode === 'string'
          ? androidVersionCode
          : undefined;

  const openExternalLink = useCallback(
    async (url: string) => {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        showAlert({
          title: t('common.error'),
          message: t('common.failedToOpenLink'),
          buttons: [{ text: t('common.ok') }],
        });
      }
    },
    [t],
  );

  const aboutRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'terms',
        icon: 'doc.text.fill',
        label: t('settings.terms'),
        onPress: () => openExternalLink(LINKS.terms),
      },
      {
        key: 'privacy',
        icon: 'lock.fill',
        label: t('settings.privacy'),
        onPress: () => openExternalLink(LINKS.privacy),
      },
      {
        key: 'status',
        icon: 'waveform.path',
        label: t('settings.status'),
        onPress: () => openExternalLink(LINKS.status),
      },
      {
        key: 'change-log',
        icon: 'clock.fill',
        label: t('settings.changeLog'),
        onPress: () => openExternalLink(LINKS.changeLog),
      },
      {
        key: 'system-log',
        icon: 'square.and.pencil',
        label: t('settings.systemLog'),
        description: t('settings.notImplemented'),
        onPress: showNotImplemented,
      },
      {
        key: 'version',
        icon: 'info.circle.fill',
        label: t('settings.version'),
        value: versionDisplay,
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
    [buildNumber, openExternalLink, showNotImplemented, t, versionDisplay],
  );

  return (
    <SettingsSubpageLayout title={t('settings.about')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {aboutRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < aboutRows.length - 1}
                accessory={item.accessory}
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

