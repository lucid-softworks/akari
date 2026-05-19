import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import {
  useRequestCommunityNote,
  useSubmitCommunityNote,
  type RequestCommunityNoteInput,
  type SubmitCommunityNoteInput,
} from '@/hooks/mutations/useSubmitCommunityNote';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type TFn = ReturnType<typeof useTranslation>['t'];

const getClassificationOptions = (
  t: TFn,
): { id: SubmitCommunityNoteInput['classification']; label: string }[] => [
  { id: 'misleading', label: t('communityNotes.contributor.classification.misleading') },
  { id: 'missingContext', label: t('communityNotes.contributor.classification.missingContext') },
  { id: 'outdated', label: t('communityNotes.contributor.classification.outdated') },
  { id: 'satire', label: t('communityNotes.contributor.classification.satire') },
  { id: 'other', label: t('communityNotes.contributor.classification.other') },
];

const getRequestReasons = (
  t: TFn,
): { id: RequestCommunityNoteInput['reason']; label: string }[] => [
  { id: 'misinformation', label: t('communityNotes.contributor.requestReason.misinformation') },
  { id: 'missingContext', label: t('communityNotes.contributor.requestReason.missingContext') },
  { id: 'manipulation', label: t('communityNotes.contributor.requestReason.manipulation') },
  { id: 'spam', label: t('communityNotes.contributor.requestReason.spam') },
  { id: 'other', label: t('communityNotes.contributor.requestReason.other') },
];

/**
 * Contributor-facing "Add a Community Note" modal. Captures:
 *   - A classification (matches X's contributor radio choices),
 *   - The note body,
 *   - Sources (one URL per line; trivial parsing keeps the form fast on
 *     mobile where adding a real source-row repeater is heavier UX).
 *
 * Submission goes through `useSubmitCommunityNote`, which is currently
 * a stub that logs + 350ms latency.
 */
export function AddCommunityNoteModal({
  onClose,
  postUri,
}: {
  onClose: () => void;
  postUri: string;
}) {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  const [classification, setClassification] =
    useState<SubmitCommunityNoteInput['classification']>('missingContext');
  const [body, setBody] = useState('');
  const [sourcesRaw, setSourcesRaw] = useState('');

  const submit = useSubmitCommunityNote();
  const classificationOptions = getClassificationOptions(t);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    const sources = sourcesRaw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    await submit.mutateAsync({
      postUri,
      classification,
      body: body.trim(),
      sources,
    });
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} maxWidth={620} height="85%">
      <View style={styles.contents}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.title}>{t('communityNotes.contributor.addTitle')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: secondary }]}>
            {t('communityNotes.contributor.addSubtitle')}
          </ThemedText>
        </View>

        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body}>
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>
            {t('communityNotes.contributor.problemQuestion')}
          </ThemedText>
          <View style={styles.chipRow}>
            {classificationOptions.map((opt) => {
              const active = classification === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setClassification(opt.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? tint : borderColor,
                      backgroundColor: active ? `${tint}22` : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipLabel,
                      active ? { color: tint, fontWeight: fontWeight.semibold } : null,
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('communityNotes.contributor.yourNote')}</ThemedText>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('communityNotes.contributor.notePlaceholder')}
            placeholderTextColor={secondary}
            multiline
            style={[
              styles.input,
              styles.inputMultiline,
              { borderColor, color: textColor, backgroundColor: inputBg },
            ]}
          />

          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>
            {t('communityNotes.contributor.sourcesLabel')}
          </ThemedText>
          <TextInput
            value={sourcesRaw}
            onChangeText={setSourcesRaw}
            placeholder={'https://example.org/study\nhttps://example.org/dataset'}
            placeholderTextColor={secondary}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              styles.inputMultiline,
              { borderColor, color: textColor, backgroundColor: inputBg },
            ]}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            disabled={submit.isPending}
            style={[styles.footerButton, { borderColor }]}
          >
            <ThemedText style={styles.footerButtonLabel}>{t('communityNotes.contributor.cancel')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!body.trim() || submit.isPending}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: tint },
              (!body.trim() || submit.isPending) && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              {submit.isPending ? t('communityNotes.contributor.submitting') : t('communityNotes.contributor.submitNote')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
}

/**
 * Reader-facing "Request a Community Note" modal. Lighter than the
 * contributor flow — picks a reason + optional comment, then fires
 * the stubbed request mutation. Used when a reader spots a post that
 * looks misleading but doesn't have contributor access themselves.
 */
export function RequestCommunityNoteModal({
  onClose,
  postUri,
}: {
  onClose: () => void;
  postUri: string;
}) {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  const [reason, setReason] = useState<RequestCommunityNoteInput['reason']>('misinformation');
  const [comment, setComment] = useState('');

  const request = useRequestCommunityNote();
  const requestReasons = getRequestReasons(t);

  const handleSubmit = async () => {
    await request.mutateAsync({
      postUri,
      reason,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} maxWidth={560} height="70%">
      <View style={styles.contents}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.title}>{t('communityNotes.contributor.requestTitle')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: secondary }]}>
            {t('communityNotes.contributor.requestSubtitle')}
          </ThemedText>
        </View>

        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body}>
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('communityNotes.contributor.reason')}</ThemedText>
          <View style={styles.chipRow}>
            {requestReasons.map((opt) => {
              const active = reason === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setReason(opt.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? tint : borderColor,
                      backgroundColor: active ? `${tint}22` : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipLabel,
                      active ? { color: tint, fontWeight: fontWeight.semibold } : null,
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>
            {t('communityNotes.contributor.anythingElseOptional')}
          </ThemedText>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('communityNotes.contributor.commentPlaceholder')}
            placeholderTextColor={secondary}
            multiline
            style={[
              styles.input,
              styles.inputMultiline,
              { borderColor, color: textColor, backgroundColor: inputBg },
            ]}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            disabled={request.isPending}
            style={[styles.footerButton, { borderColor }]}
          >
            <ThemedText style={styles.footerButtonLabel}>{t('communityNotes.contributor.cancel')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={request.isPending}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: tint },
              request.isPending && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              {request.isPending ? t('communityNotes.contributor.submitting') : t('communityNotes.contributor.sendRequest')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  contents: { flex: 1 },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  bodyScroll: { flex: 1 },
  body: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    borderColor: 'transparent',
  },
  footerButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  footerButtonLabelPrimary: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: fontSize.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
