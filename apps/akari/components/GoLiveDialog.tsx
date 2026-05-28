import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyActorStatusView } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import {
  fontSize,
  fontWeight,
  hitSlop,
  layout,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useClearLiveStatus } from '@/hooks/mutations/useClearLiveStatus';
import { useSetLiveStatus } from '@/hooks/mutations/useSetLiveStatus';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import {
  allowedLiveHostsForDid,
  formatAllowedLiveServices,
  getLiveHost,
  isLiveHostAllowed,
  isProfileLive,
} from '@/utils/liveStatus';

type GoLiveDialogProps = {
  /** DID of the current account (the one going live). */
  did?: string;
  /** Existing status, when editing an active broadcast. */
  status?: BlueskyActorStatusView;
  onClose: () => void;
};

const DURATION_OPTIONS = [
  { minutes: 30, key: 'live.duration30Minutes' as const },
  { minutes: 60, key: 'live.duration1Hour' as const },
  { minutes: 120, key: 'live.duration2Hours' as const },
  { minutes: 240, key: 'live.duration4Hours' as const },
  { minutes: 480, key: 'live.duration8Hours' as const },
];

/** Prepend `https://` when the user typed a bare host (matches paste-a-link UX). */
function coerceUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** "2h 15m" / "45m" from a positive minute count. */
function formatRemaining(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export function GoLiveDialog({ did, status, onClose }: GoLiveDialogProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const mutedColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const dangerColor = semanticColors.danger;
  const { showToast } = useToast();

  const { data: liveNowEntries = [] } = useLiveNow();
  const setLiveStatus = useSetLiveStatus();
  const clearLiveStatus = useClearLiveStatus();

  const isLive = isProfileLive(status, did, liveNowEntries);

  const existingRecord = (status?.record ?? {}) as {
    durationMinutes?: number;
  };

  const [link, setLink] = useState(status?.embed?.external?.uri ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    existingRecord.durationMinutes ?? 240,
  );

  const allowedHosts = useMemo(
    () => allowedLiveHostsForDid(did, liveNowEntries),
    [did, liveNowEntries],
  );

  const coerced = coerceUrl(link);
  const host = coerced ? getLiveHost(coerced) : null;
  const hasInput = coerced.length > 0;
  const linkValid = !!host;
  const hostAllowed = linkValid && isLiveHostAllowed(host!, allowedHosts);

  const errorMessage = !hasInput
    ? null
    : !linkValid
      ? t('live.invalidLink')
      : !hostAllowed
        ? t('live.unsupportedService', {
            services: formatAllowedLiveServices(allowedHosts),
          })
        : null;

  const pending = setLiveStatus.isPending || clearLiveStatus.isPending;
  const canSubmit = hasInput && hostAllowed && !pending;

  const remainingLabel = useMemo(() => {
    if (!status?.expiresAt) return null;
    const remaining = (new Date(status.expiresAt).getTime() - Date.now()) / 60000;
    if (!Number.isFinite(remaining) || remaining <= 0) return null;
    return t('live.expiresIn', { duration: formatRemaining(remaining) });
  }, [status?.expiresAt, t]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    setLiveStatus.mutate(
      { url: coerced, durationMinutes },
      {
        onSuccess: () => {
          showToast({ message: t('live.nowLive'), type: 'success' });
          onClose();
        },
        onError: () => {
          showToast({ message: t('live.updateFailed'), type: 'error' });
        },
      },
    );
  };

  const handleEndLive = () => {
    clearLiveStatus.mutate(undefined, {
      onSuccess: () => {
        showToast({ message: t('live.noLongerLive'), type: 'success' });
        onClose();
      },
      onError: () => {
        showToast({ message: t('live.updateFailed'), type: 'error' });
      },
    });
  };

  return (
    <Dialog onClose={onClose} nativePresentation="sheet" keyboardAvoiding dismissOnBackdropPress={false} maxWidth={540}>
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button">
            <ThemedText style={styles.headerAction}>{t('common.cancel')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {isLive ? t('live.liveTitle') : t('live.title')}
          </ThemedText>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={hitSlop} accessibilityRole="button">
            <ThemedText style={[styles.headerAction, styles.headerSubmit, !canSubmit && styles.headerDisabled]}>
              {isLive ? t('live.save') : t('live.goLiveAction')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {isLive && remainingLabel ? (
            <ThemedText style={[styles.remaining, { color: mutedColor }]}>{remainingLabel}</ThemedText>
          ) : null}

          <View style={styles.field}>
            <ThemedText style={styles.label}>{t('live.liveLink')}</ThemedText>
            <Input
              value={link}
              onChangeText={setLink}
              placeholder={t('live.liveLinkPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              size="lg"
            />
            {errorMessage ? (
              <ThemedText style={[styles.errorText, { color: dangerColor }]}>{errorMessage}</ThemedText>
            ) : (
              <ThemedText style={[styles.hint, { color: mutedColor }]}>
                {t('live.supportedServices', { services: formatAllowedLiveServices(allowedHosts) })}
              </ThemedText>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>{t('live.duration')}</ThemedText>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map(({ minutes, key }) => {
                const active = durationMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => setDurationMinutes(minutes)}
                    style={[styles.durationChip, { borderColor }, active && styles.durationChipActive]}
                    accessibilityRole="button"
                  >
                    <ThemedText style={[styles.durationChipText, active && styles.durationChipTextActive]}>
                      {t(key)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isLive ? (
            <Pressable
              onPress={handleEndLive}
              disabled={pending}
              style={({ pressed }) => [styles.endButton, { borderColor: dangerColor }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.endButtonText, { color: dangerColor }]}>
                {t('live.endLive')}
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  container: Platform.OS === 'web' ? { maxHeight: 560 } : { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  headerAction: {
    fontSize: fontSize.base,
  },
  headerSubmit: {
    color: semanticColors.systemBlue,
    fontWeight: fontWeight.semibold,
  },
  headerDisabled: {
    opacity: 0.4,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  remaining: {
    fontSize: fontSize.sm,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  durationChipActive: {
    backgroundColor: semanticColors.systemBlue,
    borderColor: semanticColors.systemBlue,
  },
  durationChipText: {
    fontSize: fontSize.sm,
  },
  durationChipTextActive: {
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
  endButton: {
    height: layout.avatarSmall,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
