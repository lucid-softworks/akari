import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export type ScanCardProps = {
  isRunning: boolean;
  isPaused: boolean;
  hasAnyData: boolean;
  rateLimitWaitMs: number;
  scanSubtitle: string;
  onStart: () => void;
  onPause: () => void;
  onClear: () => void;
  startDisabled: boolean;
  borderColor: string;
  tintColor: string;
  textColor: string;
  subduedColor: string;
  dangerColor: string;
};

export function ScanCard({
  isRunning,
  isPaused,
  hasAnyData,
  rateLimitWaitMs,
  scanSubtitle,
  onStart,
  onPause,
  onClear,
  startDisabled,
  borderColor,
  tintColor,
  textColor,
  subduedColor,
  dangerColor,
}: ScanCardProps) {
  const { t } = useTranslation();
  // Paused + rate-limited: lock the button to a countdown so the user can
  // see why "Resume" isn't available yet.
  const isRateLockedWhilePaused = isPaused && rateLimitWaitMs > 0;
  const startLabel = isRateLockedWhilePaused
    ? t('settings.followingCleanup.waitingForRateLimit', {
        seconds: Math.ceil(rateLimitWaitMs / 1000),
      })
    : isPaused
    ? t('settings.followingCleanup.resume')
    : hasAnyData
    ? t('settings.followingCleanup.rescan')
    : t('settings.followingCleanup.startScan');
  const startButtonDisabled = startDisabled || isRateLockedWhilePaused;

  return (
    <SettingsSection>
      <ThemedView style={[styles.sectionCard, styles.scanCard, { borderColor }]}>
        <View style={styles.scanInfoRow}>
          <View style={styles.scanInfoText}>
            <ThemedText style={[styles.scanTitle, { color: textColor }]}>
              {t('settings.followingCleanup.scanTitle')}
            </ThemedText>
            <ThemedText style={[styles.scanSubtitle, { color: subduedColor }]}>
              {scanSubtitle}
            </ThemedText>
          </View>
          {isRunning ? <ActivityIndicator color={tintColor} /> : null}
        </View>

        <View style={styles.scanActions}>
          {isRunning ? (
            <Pressable
              onPress={onPause}
              accessibilityRole="button"
              hitSlop={hitSlop}
              style={({ pressed }) => [
                styles.scanButton,
                styles.scanButtonPrimary,
                { borderColor: tintColor },
                pressed && { opacity: activeOpacity.default },
              ]}
            >
              <ThemedText style={[styles.scanButtonText, { color: tintColor }]}>
                {t('settings.followingCleanup.pause')}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={onStart}
              disabled={startButtonDisabled}
              accessibilityRole="button"
              hitSlop={hitSlop}
              style={({ pressed }) => [
                styles.scanButton,
                styles.scanButtonPrimary,
                { borderColor: tintColor },
                pressed && !startButtonDisabled && { opacity: activeOpacity.default },
                startButtonDisabled && styles.disabled,
              ]}
            >
              <ThemedText style={[styles.scanButtonText, { color: tintColor }]}>
                {startLabel}
              </ThemedText>
            </Pressable>
          )}
          {hasAnyData && !isRunning ? (
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              hitSlop={hitSlop}
              style={({ pressed }) => [
                styles.scanButton,
                styles.scanButtonSecondary,
                { borderColor: dangerColor },
                pressed && { opacity: activeOpacity.default },
              ]}
            >
              <ThemedText style={[styles.scanButtonText, { color: dangerColor }]}>
                {t('settings.followingCleanup.clear')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  scanCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  scanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scanInfoText: {
    flex: 1,
  },
  scanTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scanSubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  scanActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  scanButtonPrimary: {
    flex: 1,
  },
  scanButtonSecondary: {
    paddingHorizontal: spacing.md,
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
