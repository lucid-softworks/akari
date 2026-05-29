import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { OZONE_EVENT_TYPES, type OzoneSubject } from 'bluesky-ozone';

import { Image } from '@/components/Image';
import { ActionPicker } from '@/components/moderation/OzoneActionPicker';
import { AddRemoveFields } from '@/components/moderation/OzoneAddRemoveFields';
import { EmailFields } from '@/components/moderation/OzoneEmailFields';
import { SheetFooter } from '@/components/moderation/OzoneSheetFooter';
import { ACTION_OPTIONS, type OzoneActionType } from '@/components/moderation/ozoneActions';
import { Dialog } from '@/components/ui/Dialog';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, opacity, radius, spacing } from '@/constants/tokens';
import { useEmitOzoneEvent } from '@/hooks/mutations/useEmitOzoneEvent';
import { useOzoneCommTemplates } from '@/hooks/queries/useOzoneCommTemplates';
import { useOzoneLabelOptions } from '@/hooks/queries/useOzoneLabelOptions';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type OzoneActionSheetProps = {
  subject: OzoneSubject | null;
  /** Human-friendly label (e.g. handle, AT URI tail) for the modal header. */
  subjectLabel?: string;
  /** Avatar URL for the subject (account avatar or post-author avatar). */
  subjectAvatar?: string;
  /** Handle for the subject (used in the preview header + initial fallback). */
  subjectHandle?: string;
  /** Short text preview for record subjects (post text, etc.). */
  subjectSnippet?: string;
  onClose: () => void;
  /** Notified after a successful emit so the caller can show a toast etc. */
  onSuccess?: (event: { type: OzoneActionType; comment: string }) => void;
};

/**
 * Modal action picker for the moderation queue. Pick an event type, fill
 * in any subtype-specific fields (labels for `label`, tag list for
 * `tag`, etc.), add a comment, and emit. Errors surface inline; on
 * success the caller's `onSuccess` fires and the modal auto-closes.
 *
 * Kept intentionally minimal: comment, tags, labels are free-text CSV
 * fields. We don't yet pull the configured label set / tag set from
 * Ozone's settings — that's a follow-up once the action workflow is
 * exercised.
 */
export function OzoneActionSheet({
  subject,
  subjectLabel,
  subjectAvatar,
  subjectHandle,
  subjectSnippet,
  onClose,
  onSuccess,
}: OzoneActionSheetProps) {
  const borderColor = useBorderColor();
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'text');
  const { t } = useTranslation();

  const [action, setAction] = useState<OzoneActionType>('comment');
  const [comment, setComment] = useState('');
  const [selectedLabelsAdd, setSelectedLabelsAdd] = useState<Set<string>>(new Set());
  const [selectedLabelsRemove, setSelectedLabelsRemove] = useState<Set<string>>(new Set());
  const [labelsAddOther, setLabelsAddOther] = useState('');
  const [labelsRemoveOther, setLabelsRemoveOther] = useState('');
  const [selectedTagsAdd, setSelectedTagsAdd] = useState<Set<string>>(new Set());
  const [selectedTagsRemove, setSelectedTagsRemove] = useState<Set<string>>(new Set());
  const [tagsAddOther, setTagsAddOther] = useState('');
  const [tagsRemoveOther, setTagsRemoveOther] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const emit = useEmitOzoneEvent();
  const { data: labelOptions } = useOzoneLabelOptions();
  const { data: templates } = useOzoneCommTemplates();

  // Each action surfaces a different set of extra fields. Keep the gate
  // local so the form only shows what's relevant.
  const showLabels = action === 'label';
  const showTags = action === 'tag';
  const showDuration = action === 'takedown' || action === 'mute' || action === 'muteReporter';
  const showEmail = action === 'email';
  // Submit button + active-chip accent track destructiveness from the
  // shared ACTION_OPTIONS source-of-truth so we don't have to keep
  // separate lists in sync.
  const activeOption = ACTION_OPTIONS.find((o) => o.id === action);
  const isDestructive = !!activeOption?.destructive;

  const eventPayload = useMemo<Record<string, unknown> | null>(() => {
    if (!subject) return null;
    const $type = OZONE_EVENT_TYPES[action];
    const base: Record<string, unknown> = { $type };
    if (comment.trim()) base.comment = comment.trim();
    switch (action) {
      case 'label':
        base.createLabelVals = dedupeStrings([...selectedLabelsAdd, ...csv(labelsAddOther)]);
        base.negateLabelVals = dedupeStrings([...selectedLabelsRemove, ...csv(labelsRemoveOther)]);
        break;
      case 'tag':
        base.add = dedupeStrings([...selectedTagsAdd, ...csv(tagsAddOther)]);
        base.remove = dedupeStrings([...selectedTagsRemove, ...csv(tagsRemoveOther)]);
        break;
      case 'takedown':
      case 'mute':
      case 'muteReporter':
        if (durationHours.trim()) {
          const hours = Number.parseInt(durationHours, 10);
          if (Number.isFinite(hours) && hours > 0) base.durationInHours = hours;
        }
        break;
      case 'email':
        if (emailSubject.trim()) base.subjectLine = emailSubject.trim();
        if (emailBody.trim()) base.content = emailBody.trim();
        break;
      default:
        break;
    }
    return base;
  }, [
    subject,
    action,
    comment,
    selectedLabelsAdd,
    selectedLabelsRemove,
    labelsAddOther,
    labelsRemoveOther,
    selectedTagsAdd,
    selectedTagsRemove,
    tagsAddOther,
    tagsRemoveOther,
    durationHours,
    emailSubject,
    emailBody,
  ]);

  const onSubmit = async () => {
    if (!subject || !eventPayload) return;
    try {
      await emit.mutateAsync({
        event: eventPayload as Parameters<typeof emit.mutateAsync>[0]['event'],
        subject,
      });
      onSuccess?.({ type: action, comment });
      // Reset, then close.
      setComment('');
      setSelectedLabelsAdd(new Set());
      setSelectedLabelsRemove(new Set());
      setLabelsAddOther('');
      setLabelsRemoveOther('');
      setSelectedTagsAdd(new Set());
      setSelectedTagsRemove(new Set());
      setTagsAddOther('');
      setTagsRemoveOther('');
      setDurationHours('');
      setEmailSubject('');
      setEmailBody('');
      onClose();
    } catch {
      // Error surfaces via `emit.error` below; intentional no-op.
    }
  };

  if (!subject) return null;

  // Web shows the subject preview to the left of the form; native
  // stacks it above. The split lives one level under the header so the
  // modal title + the footer span the full sheet width regardless.
  const isWeb = Platform.OS === 'web';
  const subjectIsRecord = subject.$type === 'com.atproto.repo.strongRef';

  return (
    <Dialog keyboardAvoiding
      onClose={onClose}
      height="85%"
      // Wider modal on web because the subject + form sit side-by-side.
      maxWidth={isWeb ? 880 : 640}
    >
      <View style={styles.contents}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.title}>{t('moderation.actionSheet.title')}</ThemedText>
              {subjectLabel ? (
                <ThemedText style={[styles.subtitle, { color: secondary }]} numberOfLines={1}>
                  {subjectLabel}
                </ThemedText>
              ) : null}
            </View>

            <View style={[styles.split, isWeb ? styles.splitWeb : styles.splitNative]}>
              <View
                style={[
                  styles.preview,
                  isWeb
                    ? [styles.previewSide, { borderRightColor: borderColor }]
                    : [styles.previewTop, { borderBottomColor: borderColor }],
                ]}
              >
                <SubjectPreview
                  isRecord={subjectIsRecord}
                  avatar={subjectAvatar}
                  handle={subjectHandle}
                  label={subjectLabel}
                  snippet={subjectSnippet}
                  secondary={secondary}
                />
              </View>
              <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body}>
              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('moderation.actionSheet.action')}</ThemedText>
              <ActionPicker
                action={action}
                onSelect={setAction}
                borderColor={borderColor}
                secondary={secondary}
                tint={tint}
                dangerColor={dangerColor}
              />

              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('moderation.actionSheet.comment')}</ThemedText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Optional internal note"
                placeholderTextColor={secondary}
                multiline
                style={[styles.input, styles.inputMultiline, { color: text, borderColor }]}
              />

              {showLabels ? (
                <AddRemoveFields
                  addLabel={t('moderation.actionSheet.labelsToAdd')}
                  removeLabel={t('moderation.actionSheet.labelsToRemove')}
                  otherPlaceholder="Other labels, comma-separated"
                  options={labelOptions?.labels ?? []}
                  selectedAdd={selectedLabelsAdd}
                  onChangeAdd={setSelectedLabelsAdd}
                  selectedRemove={selectedLabelsRemove}
                  onChangeRemove={setSelectedLabelsRemove}
                  addOther={labelsAddOther}
                  onChangeAddOther={setLabelsAddOther}
                  removeOther={labelsRemoveOther}
                  onChangeRemoveOther={setLabelsRemoveOther}
                  borderColor={borderColor}
                  secondary={secondary}
                  tint={tint}
                  text={text}
                />
              ) : null}

              {showTags ? (
                <AddRemoveFields
                  addLabel={t('moderation.actionSheet.tagsToAdd')}
                  removeLabel={t('moderation.actionSheet.tagsToRemove')}
                  otherPlaceholder="Other tags, comma-separated"
                  options={labelOptions?.tags ?? []}
                  selectedAdd={selectedTagsAdd}
                  onChangeAdd={setSelectedTagsAdd}
                  selectedRemove={selectedTagsRemove}
                  onChangeRemove={setSelectedTagsRemove}
                  addOther={tagsAddOther}
                  onChangeAddOther={setTagsAddOther}
                  removeOther={tagsRemoveOther}
                  onChangeRemoveOther={setTagsRemoveOther}
                  borderColor={borderColor}
                  secondary={secondary}
                  tint={tint}
                  text={text}
                />
              ) : null}

              {showEmail ? (
                <EmailFields
                  templates={templates}
                  emailSubject={emailSubject}
                  onChangeEmailSubject={setEmailSubject}
                  emailBody={emailBody}
                  onChangeEmailBody={setEmailBody}
                  borderColor={borderColor}
                  secondary={secondary}
                  text={text}
                />
              ) : null}

              {showDuration ? (
                <>
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
                    {t('moderation.actionSheet.duration')}
                  </ThemedText>
                  <TextInput
                    value={durationHours}
                    onChangeText={setDurationHours}
                    placeholder="24"
                    placeholderTextColor={secondary}
                    keyboardType="number-pad"
                    style={[styles.input, { color: text, borderColor }]}
                  />
                </>
              ) : null}

              {emit.error ? (
                <ThemedText style={[styles.error, { color: dangerColor }]}>
                  {(emit.error as Error).message ?? 'Failed to emit event.'}
                </ThemedText>
              ) : null}
              </ScrollView>
            </View>

            <SheetFooter
              onCancel={onClose}
              onSubmit={onSubmit}
              isPending={emit.isPending}
              isDestructive={isDestructive}
              borderColor={borderColor}
              tint={tint}
              dangerColor={dangerColor}
            />
      </View>
    </Dialog>
  );
}

/**
 * Compact "what you're about to action" preview. Account subjects show
 * a large avatar + handle; record subjects show a smaller avatar, the
 * handle, and a snippet of the post text. We render the snippet
 * verbatim since this is the data we already have to hand — fetching
 * the full post view is a follow-up that'd hit Ozone's getRecord.
 */
function SubjectPreview({
  isRecord,
  avatar,
  handle,
  label,
  snippet,
  secondary,
}: {
  isRecord: boolean;
  avatar?: string;
  handle?: string;
  label?: string;
  snippet?: string;
  secondary: string;
}) {
  const placeholder = useThemeColor({ light: '#E5E7EB', dark: '#2d3133' }, 'background');
  const text = useThemeColor({}, 'text');
  const fallbackInitial = (handle?.replace(/^@/, '')?.[0] ?? '?').toUpperCase();
  const avatarSize = isRecord ? 48 : 72;

  return (
    <View style={styles.previewBody}>
      <ThemedText style={[styles.previewKind, { color: secondary }]}>
        {isRecord ? 'POST' : 'ACCOUNT'}
      </ThemedText>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: placeholder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText style={{ fontSize: avatarSize * 0.4, fontWeight: fontWeight.semibold, color: text }}>
            {fallbackInitial}
          </ThemedText>
        </View>
      )}
      {handle ? (
        <ThemedText style={styles.previewHandle} numberOfLines={1}>
          {handle.startsWith('@') ? handle : `@${handle}`}
        </ThemedText>
      ) : null}
      {label && label !== handle && label !== `@${handle}` ? (
        <ThemedText style={[styles.previewLabel, { color: secondary }]} numberOfLines={1}>
          {label}
        </ThemedText>
      ) : null}
      {snippet ? (
        <ThemedText style={styles.previewSnippet} numberOfLines={isRecord ? 12 : 4}>
          {snippet}
        </ThemedText>
      ) : null}
    </View>
  );
}

function csv(value: string): string[] {
  return value.split(',').reduce<string[]>((acc, s) => {
    const trimmed = s.trim();
    if (trimmed.length > 0) acc.push(trimmed);
    return acc;
  }, []);
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

const styles = StyleSheet.create({
  // CenteredModal owns the backdrop, sizing, and rounded card; this
  // component just lays out its own header / body / footer column.
  contents: {
    flex: 1,
  },
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
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  split: {
    flex: 1,
    minHeight: 0,
  },
  splitWeb: {
    flexDirection: 'row',
  },
  splitNative: {
    flexDirection: 'column',
  },
  preview: {
    // Native: subject sits above the form and is allowed to grow up
    // to a third of the modal so the action form keeps most of the
    // vertical real estate. Web fixes a column width instead.
  },
  previewSide: {
    width: 260,
    borderRightWidth: 1,
  },
  previewTop: {
    borderBottomWidth: 1,
  },
  previewBody: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  previewKind: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  previewHandle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  previewLabel: {
    fontSize: fontSize.sm,
  },
  previewSnippet: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    opacity: opacity.secondary,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  error: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
  },
});
