import { Image } from '@/components/Image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useReport, type ReportReasonType, type ReportSubject } from '@/hooks/mutations/useReport';
import { BSKY_DEFAULT_LABELER_DID, useLabelers } from '@/hooks/queries/useLabelers';
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
  const { data: labelers = [] } = useLabelers();

  const [selectedReason, setSelectedReason] = useState<ReportReasonType | null>(null);
  const [details, setDetails] = useState('');
  const [selectedLabelerDids, setSelectedLabelerDids] = useState<Set<string>>(
    () => new Set([BSKY_DEFAULT_LABELER_DID]),
  );

  // Reset to the default labeler whenever the sheet opens — keeps state from
  // a previous report from leaking into the next one.
  useEffect(() => {
    if (visible) {
      setSelectedLabelerDids(new Set([BSKY_DEFAULT_LABELER_DID]));
    }
  }, [visible]);

  const sortedLabelers = useMemo(() => {
    // Pin Bluesky's default to the top, then sort the rest by display name.
    const def = labelers.find((l) => l.creator.did === BSKY_DEFAULT_LABELER_DID);
    const rest = labelers
      .filter((l) => l.creator.did !== BSKY_DEFAULT_LABELER_DID)
      .sort((a, b) =>
        (a.creator.displayName ?? a.creator.handle).localeCompare(b.creator.displayName ?? b.creator.handle),
      );
    return def ? [def, ...rest] : rest;
  }, [labelers]);

  const toggleLabeler = useCallback((did: string) => {
    setSelectedLabelerDids((prev) => {
      const next = new Set(prev);
      if (next.has(did)) {
        // Don't let the user deselect the last labeler — there has to be at least one.
        if (next.size === 1) return prev;
        next.delete(did);
      } else {
        next.add(did);
      }
      return next;
    });
  }, []);

  const allReasonKeys: ReportReasonType[] = useMemo(
    () => ['reasonSpam', 'reasonMisleading', 'reasonSexual', 'reasonRude', 'reasonViolation', 'reasonOther'],
    [],
  );

  // Reasons available for the current selection: intersection of each
  // selected labeler's `reasonTypes`. Labelers without `reasonTypes` are
  // treated as accepting all. The lexicon namespace prefix is optional in
  // the response, so match on either.
  const availableReasons = useMemo<ReportReasonType[]>(() => {
    const selected = sortedLabelers.filter((l) => selectedLabelerDids.has(l.creator.did));
    if (selected.length === 0) return allReasonKeys;

    const allowed = new Set<ReportReasonType>(allReasonKeys);
    for (const labeler of selected) {
      if (!labeler.reasonTypes || labeler.reasonTypes.length === 0) continue;
      const labelerSet = new Set(
        labeler.reasonTypes.map((r) => r.replace('com.atproto.moderation.defs#', '')) as ReportReasonType[],
      );
      for (const key of allReasonKeys) {
        if (!labelerSet.has(key)) allowed.delete(key);
      }
    }
    return allReasonKeys.filter((k) => allowed.has(k));
  }, [sortedLabelers, selectedLabelerDids, allReasonKeys]);

  // If the previously selected reason is no longer in the available set,
  // clear the selection.
  useEffect(() => {
    if (selectedReason && !availableReasons.includes(selectedReason)) {
      setSelectedReason(null);
    }
  }, [availableReasons, selectedReason]);

  const reasonLabels: Record<ReportReasonType, string> = {
    reasonSpam: t('report.reasonSpam'),
    reasonMisleading: t('report.reasonMisleading'),
    reasonSexual: t('report.reasonSexual'),
    reasonRude: t('report.reasonRude'),
    reasonViolation: t('report.reasonViolation'),
    reasonOther: t('report.reasonOther'),
  };
  const reasons = availableReasons.map((key) => ({
    key,
    label: reasonLabels[key],
    icon: REASON_ICONS[key],
  }));

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#2c2c2e' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleSubmit = useCallback(async () => {
    if (!subject || !selectedReason || selectedLabelerDids.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedLabelerDids).map((labelerDid) =>
          reportMutation.mutateAsync({
            subject,
            reasonType: selectedReason,
            reason: details.trim() || undefined,
            labelerDid,
          }),
        ),
      );
      showToast({ message: t('report.submitted'), type: 'success' });
      setSelectedReason(null);
      setDetails('');
      onDismiss();
    } catch {
      showToast({ message: t('report.submitFailed'), type: 'error' });
    }
  }, [subject, selectedReason, details, selectedLabelerDids, reportMutation, showToast, onDismiss, t]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setDetails('');
    onDismiss();
  }, [onDismiss]);

  const isSubmitting = reportMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <ThemedView
        style={[
          styles.nativeSheet,
          {
            backgroundColor: sheetBg,
            // Android Modal `presentationStyle='fullScreen'` draws under the
            // status bar; iOS pageSheet auto-respects the top safe area.
            // `useSafeAreaInsets` returns 0 inside a Modal (separate native
            // window) — `StatusBar.currentHeight` works without any provider.
            paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
              <ThemedText style={styles.title}>
                {subject?.type === 'post' ? t('report.reportPost') : t('report.reportAccount')}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: iconColor }]}>
                {t('report.whyReporting')}
              </ThemedText>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {sortedLabelers.length > 0 && (
                  <View style={styles.labelerSection}>
                    <ThemedText style={[styles.sectionLabel, { color: iconColor }]}>
                      {t('report.sendTo')}
                    </ThemedText>
                    <View style={styles.labelerChips}>
                      {sortedLabelers.map((labeler) => {
                        const isSelected = selectedLabelerDids.has(labeler.creator.did);
                        const name = labeler.creator.displayName || labeler.creator.handle;
                        return (
                          <TouchableOpacity
                            key={labeler.creator.did}
                            style={[
                              styles.labelerChip,
                              { borderColor },
                              isSelected && { backgroundColor: inputBg, borderColor: semanticColors.danger },
                            ]}
                            onPress={() => toggleLabeler(labeler.creator.did)}
                            activeOpacity={activeOpacity.default}
                          >
                            {labeler.creator.avatar ? (
                              <Image
                                source={{ uri: labeler.creator.avatar }}
                                style={styles.labelerChipAvatar}
                              />
                            ) : (
                              <View style={[styles.labelerChipAvatar, { backgroundColor: borderColor }]} />
                            )}
                            <ThemedText
                              style={[styles.labelerChipName, { color: textColor }]}
                              numberOfLines={1}
                            >
                              {name}
                            </ThemedText>
                            {isSelected ? (
                              <IconSymbol
                                name="checkmark.circle.fill"
                                size={16}
                                color={semanticColors.danger}
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  nativeSheet: {
    flex: 1,
    paddingTop: spacing.md,
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
  labelerSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  labelerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: layout.hairline,
    maxWidth: '100%',
  },
  labelerChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  labelerChipName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
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
