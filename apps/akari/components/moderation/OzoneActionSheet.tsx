import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { OZONE_EVENT_TYPES, type OzoneSubject } from 'bluesky-ozone';

import { Image } from '@/components/Image';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, opacity, radius, spacing } from '@/constants/tokens';
import { useEmitOzoneEvent } from '@/hooks/mutations/useEmitOzoneEvent';
import { useOzoneCommTemplates } from '@/hooks/queries/useOzoneCommTemplates';
import { useOzoneLabelOptions } from '@/hooks/queries/useOzoneLabelOptions';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

type OzoneActionSheetProps = {
  visible: boolean;
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

type OzoneActionType =
  | 'comment'
  | 'acknowledge'
  | 'escalate'
  | 'resolveAppeal'
  | 'takedown'
  | 'reverseTakedown'
  | 'tag'
  | 'label'
  | 'mute'
  | 'unmute'
  | 'muteReporter'
  | 'unmuteReporter'
  | 'email';

type ActionOption = {
  id: OzoneActionType;
  label: string;
  description: string;
  /**
   * Destructive actions get red styling in the chip grid AND on the
   * submit button. Only takedown / mute* qualify — they restrict
   * what the subject can do. Escalate / label / tag don't (they're
   * just routing or annotation), and the `reverse*` / `unmute*`
   * counterparts are restorative.
   */
  destructive?: boolean;
};

const ACTION_OPTIONS: ActionOption[] = [
  { id: 'comment', label: 'Comment', description: 'Add an internal mod note.' },
  { id: 'acknowledge', label: 'Acknowledge', description: 'Mark as reviewed without taking action.' },
  { id: 'escalate', label: 'Escalate', description: 'Send to senior reviewers.' },
  { id: 'resolveAppeal', label: 'Resolve appeal', description: 'Close out an appealed subject.' },
  { id: 'takedown', label: 'Takedown', description: 'Hide the subject from the AppView.', destructive: true },
  { id: 'reverseTakedown', label: 'Reverse takedown', description: 'Restore a previously taken-down subject.' },
  { id: 'tag', label: 'Tag', description: 'Attach or remove operator tags.' },
  { id: 'label', label: 'Label', description: 'Apply or remove labels.' },
  { id: 'mute', label: 'Mute', description: 'Stop receiving reports about this subject.', destructive: true },
  { id: 'unmute', label: 'Unmute', description: 'Re-enable reports.' },
  { id: 'muteReporter', label: 'Mute reporter', description: 'Stop accepting reports from this reporter.', destructive: true },
  { id: 'unmuteReporter', label: 'Unmute reporter', description: 'Restore reports from this reporter.' },
  { id: 'email', label: 'Email', description: 'Send the subject an email through Ozone.' },
];

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
  visible,
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
    <CenteredModal
      visible={visible}
      onClose={onClose}
      height="85%"
      // Wider modal on web because the subject + form sit side-by-side.
      maxWidth={isWeb ? 880 : 640}
    >
      <View style={styles.contents}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.title}>Take action</ThemedText>
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
              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Action</ThemedText>
              <View style={styles.actionGrid}>
                {ACTION_OPTIONS.map((opt) => {
                  const active = opt.id === action;
                  // Destructive chips read in red whether active or
                  // inactive — inactive uses red text + red-tinted
                  // border so the option is recognisable in the grid
                  // before you tap it; active uses a stronger red
                  // background to match the submit button.
                  const accent = opt.destructive ? dangerColor : tint;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setAction(opt.id)}
                      style={[
                        styles.actionChip,
                        { borderColor: opt.destructive ? `${accent}66` : borderColor },
                        active && { borderColor: accent, backgroundColor: `${accent}20` },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.actionChipLabel,
                          opt.destructive ? { color: accent } : null,
                          active ? { color: accent, fontWeight: fontWeight.semibold } : null,
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText style={[styles.helper, { color: secondary }]}>
                {ACTION_OPTIONS.find((o) => o.id === action)?.description}
              </ThemedText>

              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Comment</ThemedText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Optional internal note"
                placeholderTextColor={secondary}
                multiline
                style={[styles.input, styles.inputMultiline, { color: text, borderColor }]}
              />

              {showLabels ? (
                <>
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Labels to add</ThemedText>
                  <ChipMultiSelect
                    options={labelOptions?.labels ?? []}
                    selected={selectedLabelsAdd}
                    onChange={setSelectedLabelsAdd}
                    borderColor={borderColor}
                    secondary={secondary}
                    tint={tint}
                  />
                  <TextInput
                    value={labelsAddOther}
                    onChangeText={setLabelsAddOther}
                    placeholder="Other labels, comma-separated"
                    placeholderTextColor={secondary}
                    style={[styles.input, { color: text, borderColor }]}
                  />
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Labels to remove</ThemedText>
                  <ChipMultiSelect
                    options={labelOptions?.labels ?? []}
                    selected={selectedLabelsRemove}
                    onChange={setSelectedLabelsRemove}
                    borderColor={borderColor}
                    secondary={secondary}
                    tint={tint}
                  />
                  <TextInput
                    value={labelsRemoveOther}
                    onChangeText={setLabelsRemoveOther}
                    placeholder="Other labels, comma-separated"
                    placeholderTextColor={secondary}
                    style={[styles.input, { color: text, borderColor }]}
                  />
                </>
              ) : null}

              {showTags ? (
                <>
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Tags to add</ThemedText>
                  <ChipMultiSelect
                    options={labelOptions?.tags ?? []}
                    selected={selectedTagsAdd}
                    onChange={setSelectedTagsAdd}
                    borderColor={borderColor}
                    secondary={secondary}
                    tint={tint}
                  />
                  <TextInput
                    value={tagsAddOther}
                    onChangeText={setTagsAddOther}
                    placeholder="Other tags, comma-separated"
                    placeholderTextColor={secondary}
                    style={[styles.input, { color: text, borderColor }]}
                  />
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Tags to remove</ThemedText>
                  <ChipMultiSelect
                    options={labelOptions?.tags ?? []}
                    selected={selectedTagsRemove}
                    onChange={setSelectedTagsRemove}
                    borderColor={borderColor}
                    secondary={secondary}
                    tint={tint}
                  />
                  <TextInput
                    value={tagsRemoveOther}
                    onChangeText={setTagsRemoveOther}
                    placeholder="Other tags, comma-separated"
                    placeholderTextColor={secondary}
                    style={[styles.input, { color: text, borderColor }]}
                  />
                </>
              ) : null}

              {showEmail ? (
                <>
                  {templates && templates.length > 0 ? (
                    <>
                      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
                        Template
                      </ThemedText>
                      <View style={styles.actionGrid}>
                        {templates.map((tpl) => (
                          <Pressable
                            key={tpl.id}
                            onPress={() => {
                              if (typeof tpl.subject === 'string') setEmailSubject(tpl.subject);
                              if (typeof tpl.contentMarkdown === 'string') setEmailBody(tpl.contentMarkdown);
                            }}
                            style={[styles.actionChip, { borderColor }]}
                          >
                            <ThemedText style={styles.actionChipLabel}>{tpl.name}</ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Subject</ThemedText>
                  <TextInput
                    value={emailSubject}
                    onChangeText={setEmailSubject}
                    placeholder="Email subject line"
                    placeholderTextColor={secondary}
                    style={[styles.input, { color: text, borderColor }]}
                  />
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>Body</ThemedText>
                  <TextInput
                    value={emailBody}
                    onChangeText={setEmailBody}
                    placeholder="Email body (Markdown supported)"
                    placeholderTextColor={secondary}
                    multiline
                    style={[styles.input, styles.inputMultiline, { color: text, borderColor }]}
                  />
                </>
              ) : null}

              {showDuration ? (
                <>
                  <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
                    Duration (hours, leave blank for permanent)
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

            <View style={[styles.footer, { borderTopColor: borderColor }]}>
              <Pressable
                onPress={onClose}
                style={[styles.footerButton, { borderColor }]}
                disabled={emit.isPending}
              >
                <ThemedText style={styles.footerButtonLabel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={onSubmit}
                disabled={emit.isPending}
                style={[
                  styles.footerButton,
                  styles.footerButtonPrimary,
                  { backgroundColor: isDestructive ? dangerColor : tint },
                  emit.isPending && { opacity: 0.6 },
                ]}
              >
                <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
                  {emit.isPending ? 'Submitting…' : 'Submit'}
                </ThemedText>
              </Pressable>
            </View>
      </View>
    </CenteredModal>
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
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

/**
 * Multi-select chip row. Renders one toggle per option, syncing selection
 * into a Set so the caller can preserve insertion order without re-
 * deriving each render.
 */
function ChipMultiSelect({
  options,
  selected,
  onChange,
  borderColor,
  secondary,
  tint,
}: {
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  borderColor: string;
  secondary: string;
  tint: string;
}) {
  if (options.length === 0) {
    return (
      <ThemedText style={[styles.helper, { color: secondary }]}>
        No options configured for this labeler — use the field below.
      </ThemedText>
    );
  }
  return (
    <View style={styles.actionGrid}>
      {options.map((opt) => {
        const isOn = selected.has(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => {
              const next = new Set(selected);
              if (isOn) next.delete(opt);
              else next.add(opt);
              onChange(next);
            }}
            style={[
              styles.actionChip,
              { borderColor: isOn ? tint : borderColor, backgroundColor: isOn ? `${tint}20` : 'transparent' },
            ]}
          >
            <ThemedText
              style={[
                styles.actionChipLabel,
                isOn ? { color: tint, fontWeight: fontWeight.semibold } : null,
              ]}
            >
              {opt}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionChipLabel: {
    fontSize: fontSize.sm,
  },
  helper: {
    fontSize: fontSize.sm,
    marginTop: 2,
    lineHeight: 18,
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
});
