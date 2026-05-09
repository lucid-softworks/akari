import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';

function suggestedFilename(handle: string | undefined, did: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = handle ?? did;
  return `${base}-${date}.car`;
}

/**
 * Triggers a browser download for the given Blob. Web only — uses the
 * Object URL + anchor-element trick.
 */
function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ExportDataScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const [downloading, setDownloading] = useState(false);

  const handleExport = useCallback(async () => {
    if (!token || !currentAccount?.did || !currentAccount?.pdsUrl) return;
    setDownloading(true);
    try {
      const api = apiForAccount(currentAccount);
      const blob = await api.exportRepo(token, currentAccount.did);
      const filename = suggestedFilename(currentAccount.handle, currentAccount.did);
      if (Platform.OS === 'web') {
        downloadBlob(blob, filename);
        showToast({ type: 'success', message: t('settings.exportDataSuccess') });
      } else {
        // expo-file-system / expo-sharing aren't installed yet; on native
        // we just let the user know the export ran (the bytes are in
        // memory but we can't ergonomically hand them off). When those
        // packages get added, this branch should write to a temp file
        // and call `Sharing.shareAsync(uri)`.
        showToast({ type: 'info', message: t('settings.exportDataNativeNotice') });
      }
    } catch {
      showToast({ type: 'error', message: t('settings.exportDataFailed') });
    } finally {
      setDownloading(false);
    }
  }, [currentAccount, showToast, t, token]);

  return (
    <SettingsSubpageLayout title={t('settings.exportData')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.exportDataIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <Pressable
            onPress={handleExport}
            disabled={downloading || !token || !currentAccount?.did}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: accentColor },
              pressed && { opacity: activeOpacity.default },
              (downloading || !token || !currentAccount?.did) && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            {downloading ? (
              <View style={styles.actionRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <ThemedText style={styles.actionText}>{t('settings.exportDataPreparing')}</ThemedText>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <IconSymbol name="square.and.arrow.down" size={18} color="#FFFFFF" />
                <ThemedText style={styles.actionText}>{t('settings.exportDataAction')}</ThemedText>
              </View>
            )}
          </Pressable>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  introCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actionButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
