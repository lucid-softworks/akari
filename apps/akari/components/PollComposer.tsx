import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PollFields, MIN_POLL_OPTIONS } from '@/components/PollFields';
import { ThemedText } from '@/components/ThemedText';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { fontSize, fontWeight, hitSlop, layout, semanticColors, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePoll } from '@/hooks/mutations/useCreatePoll';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';

type PollComposerProps = {
  /** Dismiss the composer (also called after a successful post). */
  onClose: () => void;
};

export function PollComposer({ onClose }: PollComposerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const { showToast } = useToast();
  const createPoll = useCreatePoll();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [durationHours, setDurationHours] = useState(24);

  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    question.trim().length > 0 && filledOptions.length >= MIN_POLL_OPTIONS && !createPoll.isPending;

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
          <PollFields
            options={options}
            onChangeOptions={setOptions}
            durationHours={durationHours}
            onChangeDuration={setDurationHours}
          />
        </ScrollView>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
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
});
