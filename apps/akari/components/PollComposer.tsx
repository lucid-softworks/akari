import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Dialog } from '@/components/ui/Dialog';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePoll } from '@/hooks/mutations/useCreatePoll';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PollComposerProps = {
  /** Dismiss the composer (also called after a successful post). */
  onClose: () => void;
};

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;

export function PollComposer({ onClose }: PollComposerProps) {
  const { t } = useTranslation();
  const durations = [
    { hours: 6, label: t('poll.duration6Hours') },
    { hours: 24, label: t('poll.duration1Day') },
    { hours: 72, label: t('poll.duration3Days') },
    { hours: 168, label: t('poll.duration7Days') },
  ];
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const { showToast } = useToast();
  const createPoll = useCreatePoll();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [durationHours, setDurationHours] = useState(24);

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addOption = () => {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev));
  };

  const removeOption = (index: number) => {
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev));
  };

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    question.trim().length > 0 && filledOptions.length >= MIN_OPTIONS && !createPoll.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    createPoll.mutate(
      { question: question.trim(), options: filledOptions, endsAt },
      {
        onSuccess: () => {
          showToast({ message: t('poll.created'), type: 'success' });
          onClose();
        },
        onError: () => {
          showToast({ message: t('poll.createFailed'), type: 'error' });
        },
      },
    );
  };

  return (
    <Dialog onClose={onClose} nativePresentation="sheet" keyboardAvoiding dismissOnBackdropPress={false} maxWidth={540}>
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button">
            <ThemedText style={styles.headerAction}>{t('common.cancel')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t('poll.newPoll')}</ThemedText>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={hitSlop} accessibilityRole="button">
            <ThemedText style={[styles.headerAction, styles.headerSubmit, !canSubmit && styles.headerDisabled]}>
              {t('poll.create')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder={t('poll.questionPlaceholder')}
            maxLength={300}
            multiline
            size="lg"
          />

          <View style={styles.optionsList}>
            {options.map((opt, index) => (
              <Input
                key={index}
                value={opt}
                onChangeText={(v) => setOption(index, v)}
                placeholder={t('poll.optionPlaceholder', { number: index + 1 })}
                maxLength={100}
                suffix={
                  options.length > MIN_OPTIONS ? (
                    <Pressable
                      onPress={() => removeOption(index)}
                      hitSlop={hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={t('poll.removeOption')}
                    >
                      <IconSymbol name="xmark" size={16} color={secondary} />
                    </Pressable>
                  ) : undefined
                }
              />
            ))}
          </View>

          {options.length < MAX_OPTIONS ? (
            <Pressable
              onPress={addOption}
              style={({ pressed }) => [styles.addOption, pressed && { opacity: activeOpacity.default }]}
              accessibilityRole="button"
            >
              <IconSymbol name="plus" size={16} color={semanticColors.systemBlue} />
              <ThemedText style={styles.addOptionText}>{t('poll.addOption')}</ThemedText>
            </Pressable>
          ) : null}

          <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('poll.duration')}</ThemedText>
          <View style={styles.durationRow}>
            {durations.map(({ hours, label }) => {
              const active = hours === durationHours;
              return (
                <Pressable
                  key={hours}
                  onPress={() => setDurationHours(hours)}
                  style={({ pressed }) => [
                    styles.durationChip,
                    { borderColor },
                    active && styles.durationChipActive,
                    pressed && { opacity: activeOpacity.default },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText style={[styles.durationChipText, active && styles.durationChipTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  // Cap the height on web so the centered card scrolls instead of growing
  // past the viewport; on the native sheet the surface already bounds it.
  container: {
    ...(Platform.OS === 'web' ? { maxHeight: 560 } : { flex: 1 }),
  },
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
    gap: spacing.md,
  },
  optionsList: {
    gap: spacing.sm,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addOptionText: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: layout.hairline,
  },
  durationChipActive: {
    backgroundColor: semanticColors.systemBlue,
    borderColor: semanticColors.systemBlue,
  },
  durationChipText: {
    fontSize: fontSize.sm,
  },
  durationChipTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
});
