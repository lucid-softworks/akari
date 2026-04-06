import React, { useCallback, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useReport, type ReportReasonType, type ReportSubject } from '@/hooks/mutations/useReport';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';

type ReportSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  subject: ReportSubject | null;
};

const REASON_ICONS: Record<ReportReasonType, string> = {
  reasonSpam: 'xmark.bin',
  reasonMisleading: 'exclamationmark.triangle',
  reasonSexual: 'eye.slash',
  reasonRude: 'hand.raised',
  reasonViolation: 'exclamationmark.shield',
  reasonOther: 'ellipsis.circle',
};

export function ReportSheet({ visible, onDismiss, subject }: ReportSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reportMutation = useReport();
  const { showToast } = useToast();

  const [selectedReason, setSelectedReason] = useState<ReportReasonType | null>(null);
  const [details, setDetails] = useState('');

  const reasons: { key: ReportReasonType; label: string; icon: string }[] = [
    { key: 'reasonSpam', label: t('report.reasonSpam'), icon: REASON_ICONS.reasonSpam },
    { key: 'reasonMisleading', label: t('report.reasonMisleading'), icon: REASON_ICONS.reasonMisleading },
    { key: 'reasonSexual', label: t('report.reasonSexual'), icon: REASON_ICONS.reasonSexual },
    { key: 'reasonRude', label: t('report.reasonRude'), icon: REASON_ICONS.reasonRude },
    { key: 'reasonViolation', label: t('report.reasonViolation'), icon: REASON_ICONS.reasonViolation },
    { key: 'reasonOther', label: t('report.reasonOther'), icon: REASON_ICONS.reasonOther },
  ];

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const handleBarColor = useThemeColor({ light: '#d1d1d6', dark: '#3a3a3c' }, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#2c2c2e' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleSubmit = useCallback(() => {
    if (!subject || !selectedReason) return;

    reportMutation.mutate(
      {
        subject,
        reasonType: selectedReason,
        reason: details.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast({ message: t('report.submitted'), type: 'success' });
          setSelectedReason(null);
          setDetails('');
          onDismiss();
        },
        onError: () => {
          showToast({ message: t('report.submitFailed'), type: 'error' });
        },
      },
    );
  }, [subject, selectedReason, details, reportMutation, showToast, onDismiss]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDetails('');
    onDismiss();
  }, [onDismiss]);

  const isSubmitting = reportMutation.isPending;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <ThemedView
              style={[
                styles.sheet,
                {
                  backgroundColor: sheetBg,
                  paddingBottom: insets.bottom + spacing.lg,
                  maxWidth: 420,
                },
              ]}
            >
              <View style={styles.handleBarContainer}>
                <View style={[styles.handleBar, { backgroundColor: handleBarColor }]} />
              </View>

              <ThemedText style={styles.title}>
                {subject?.type === 'post' ? t('report.reportPost') : t('report.reportAccount')}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: iconColor }]}>
                {t('report.whyReporting')}
              </ThemedText>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {reasons.map((reason) => {
                  const isSelected = selectedReason === reason.key;
                  return (
                    <TouchableOpacity
                      key={reason.key}
                      style={[
                        styles.reasonItem,
                        isSelected && { backgroundColor: inputBg },
                      ]}
                      onPress={() => setSelectedReason(reason.key)}
                      activeOpacity={activeOpacity.default}
                    >
                      <IconSymbol
                        name={reason.icon as any}
                        size={20}
                        color={isSelected ? semanticColors.danger : iconColor}
                      />
                      <ThemedText style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                        {reason.label}
                      </ThemedText>
                      {isSelected ? (
                        <IconSymbol name="checkmark.circle.fill" size={20} color={semanticColors.danger} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                {selectedReason ? (
                  <View style={styles.detailsContainer}>
                    <ThemedText style={[styles.detailsLabel, { color: iconColor }]}>
                      {t('report.additionalDetails')}
                    </ThemedText>
                    <TextInput
                      style={[styles.detailsInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                      value={details}
                      onChangeText={setDetails}
                      placeholder={t('report.describeIssue')}
                      placeholderTextColor={iconColor}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <ThemedText style={styles.cancelText}>{t('common.cancel')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, (!selectedReason || isSubmitting) && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                >
                  <ThemedText style={styles.submitText}>
                    {isSubmitting ? t('report.submitting') : t('report.submitReport')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    width: '100%',
    maxHeight: '80%',
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.lg,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: fontWeight.semibold,
  },
  detailsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  detailsLabel: {
    fontSize: fontSize.base,
  },
  detailsInput: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.base,
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  cancelText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: semanticColors.danger,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
