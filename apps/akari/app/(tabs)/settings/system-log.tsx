import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import {
  clearSystemLog,
  getSystemLog,
  subscribeSystemLog,
  type SystemLogEntry,
  type SystemLogLevel,
} from '@/utils/systemLog';

const LEVEL_COLOR: Record<SystemLogLevel, string> = {
  log: '#6B7280',
  info: semanticColors.systemBlue,
  warn: '#F59E0B',
  error: semanticColors.danger,
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

function formatForCopy(entries: readonly SystemLogEntry[]): string {
  return entries
    .map((e) => `${new Date(e.ts).toISOString()} [${e.level.toUpperCase()}] ${e.message}`)
    .join('\n');
}

export default function SystemLogScreen() {
  const borderColor = useBorderColor();
  const textColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const entries = useSyncExternalStore(subscribeSystemLog, getSystemLog, getSystemLog);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(formatForCopy(entries));
      showToast({ type: 'success', message: t('common.copiedToClipboard') });
    } catch {
      showToast({ type: 'error', message: t('common.error') });
    }
  }, [entries, showToast, t]);

  return (
    <SettingsSubpageLayout title={t('settings.systemLog')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.systemLogIntro')}
        </ThemedText>

        <View style={styles.toolbar}>
          <Pressable
            onPress={handleCopy}
            disabled={entries.length === 0}
            style={({ pressed }) => [
              styles.toolbarButton,
              { borderColor },
              pressed && { opacity: activeOpacity.default },
              entries.length === 0 && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <IconSymbol name="doc.on.doc" size={16} color={textColor} />
            <ThemedText style={[styles.toolbarLabel, { color: textColor }]}>
              {t('settings.systemLogCopy')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={clearSystemLog}
            disabled={entries.length === 0}
            style={({ pressed }) => [
              styles.toolbarButton,
              { borderColor },
              pressed && { opacity: activeOpacity.default },
              entries.length === 0 && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <IconSymbol name="trash" size={16} color={semanticColors.danger} />
            <ThemedText style={[styles.toolbarLabel, { color: semanticColors.danger }]}>
              {t('settings.systemLogClear')}
            </ThemedText>
          </Pressable>
        </View>

        {entries.length === 0 ? (
          <ThemedText style={[styles.empty, { color: subduedColor }]}>
            {t('settings.systemLogEmpty')}
          </ThemedText>
        ) : (
          <ThemedView style={[styles.logCard, { borderColor }]}>
            {entries.map((entry, idx) => (
              <View
                key={`${entry.ts}-${idx}`}
                style={[
                  styles.row,
                  idx < entries.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
                ]}
              >
                <ThemedText style={[styles.timestamp, { color: subduedColor }]}>
                  {formatTimestamp(entry.ts)}
                </ThemedText>
                <ThemedText style={[styles.level, { color: LEVEL_COLOR[entry.level] }]}>
                  {entry.level.toUpperCase()}
                </ThemedText>
                <ThemedText style={[styles.message, { color: textColor }]} selectable>
                  {entry.message}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        )}
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  intro: {
    marginHorizontal: spacing.lg,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toolbarLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.4 },
  empty: {
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
  logCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  timestamp: {
    fontSize: fontSize.xs,
    fontFamily: 'Menlo',
  },
  level: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: 'Menlo',
    lineHeight: 18,
  },
});
