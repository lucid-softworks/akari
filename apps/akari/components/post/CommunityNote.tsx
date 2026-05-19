import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  opacity,
  radius,
  spacing,
} from '@/constants/tokens';
import { useDialogManager } from '@/contexts/DialogContext';
import {
  useRateCommunityNote,
  type CommunityNoteHelpfulness,
} from '@/hooks/mutations/useRateCommunityNote';
import { type CommunityNote as CommunityNoteData } from '@/hooks/queries/useCommunityNote';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

const HELPFUL_REASONS = [
  { id: 'cites-sources', label: 'Cites high-quality sources' },
  { id: 'easy-to-understand', label: 'Easy to understand' },
  { id: 'addresses-claim', label: 'Directly addresses the claim' },
  { id: 'provides-context', label: 'Provides important context' },
  { id: 'fair-balanced', label: 'Written in a neutral tone' },
];

const NOT_HELPFUL_REASONS = [
  { id: 'sources-do-not-support', label: 'Sources do not support the note' },
  { id: 'incorrect-info', label: 'Contains incorrect information' },
  { id: 'opinion', label: 'Opinion, not fact' },
  { id: 'argumentative', label: 'Argumentative or biased' },
  { id: 'irrelevant', label: 'Irrelevant to the post' },
];

/**
 * X-style "Readers added context" panel rendered inline under a post's
 * content. Two visual variants follow the upstream lifecycle:
 *   - `currentlyRatedHelpful`: subtle background, "Readers added
 *     context" headline.
 *   - `needsMoreRatings`: muted treatment, headline shifts to "Note
 *     under review — needs more ratings".
 *
 * "Rate this note" opens a modal with helpful / somewhat / not-helpful
 * radios + a reason chip multiselect, mirroring X's contributor flow.
 * The submission goes through {@link useRateCommunityNote}, which is
 * currently a stub.
 */
export function CommunityNote({ note }: { note: CommunityNoteData }) {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const panelBg = useThemeColor(
    { light: '#FFF9F1', dark: '#1F1A11' },
    'background',
  );
  const reviewPanelBg = useThemeColor(
    { light: '#F6F8FB', dark: '#16181C' },
    'background',
  );
  const accentBorder = useThemeColor({ light: '#F0B458', dark: '#5A4621' }, 'border');

  const dialogManager = useDialogManager();

  const handleOpenRate = () => {
    const id = `community-note-rate-${note.id}`;
    dialogManager.open({
      id,
      component: (
        <RateNoteModal
          onClose={() => dialogManager.close(id)}
          noteId={note.id}
        />
      ),
    });
  };

  const handleOpenSources = () => {
    const id = `community-note-sources-${note.id}`;
    dialogManager.open({
      id,
      component: (
        <SourcesModal
          onClose={() => dialogManager.close(id)}
          sources={note.sources ?? []}
        />
      ),
    });
  };

  const isHelpful = note.status === 'currentlyRatedHelpful';
  const containerBg = isHelpful ? panelBg : reviewPanelBg;
  const headline = isHelpful
    ? 'Readers added context'
    : 'Note under review — needs more ratings';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderColor: isHelpful ? accentBorder : borderColor,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <IconSymbol
          name="info.circle.fill"
          size={16}
          color={isHelpful ? '#C58A1B' : secondary}
        />
        <ThemedText style={styles.headline}>{headline}</ThemedText>
      </View>

      <ThemedText style={styles.body}>{note.body}</ThemedText>

      <ThemedText style={[styles.rating, { color: secondary }]}>
        {`${note.helpfulPercent}% of ${note.ratingCount} raters found this helpful`}
      </ThemedText>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={(event: { stopPropagation?: () => void }) => {
            event?.stopPropagation?.();
            handleOpenRate();
          }}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: tint },
            pressed && { opacity: activeOpacity.default },
          ]}
        >
          <ThemedText style={[styles.actionLabel, { color: tint }]}>
            Rate this note
          </ThemedText>
        </Pressable>
        {note.sources && note.sources.length > 0 ? (
          <Pressable
            onPress={(event: { stopPropagation?: () => void }) => {
              event?.stopPropagation?.();
              handleOpenSources();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor },
              pressed && { opacity: activeOpacity.default },
            ]}
          >
            <ThemedText style={[styles.actionLabel, { color: secondary }]}>
              View sources
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function RateNoteModal({
  onClose,
  noteId,
}: {
  onClose: () => void;
  noteId: string;
}) {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const [helpfulness, setHelpfulness] = useState<CommunityNoteHelpfulness | null>(null);
  const [reasons, setReasons] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const rate = useRateCommunityNote();

  // DialogManager unmounts this component on close, so each open starts
  // with a fresh state slate; no manual reset effect needed.

  const reasonOptions =
    helpfulness === 'notHelpful' ? NOT_HELPFUL_REASONS : HELPFUL_REASONS;

  const submit = async () => {
    if (!helpfulness) return;
    await rate.mutateAsync({
      noteId,
      helpfulness,
      reasons: Array.from(reasons),
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} maxWidth={560} height="85%">
      <View style={styles.modalContents}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.modalTitle}>Is this note helpful?</ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: secondary }]}>
            Your rating helps decide whether the note is shown to other readers.
          </ThemedText>
        </View>

        <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody}>
          <View style={styles.helpfulRow}>
            {([
              { id: 'helpful', label: 'Helpful' },
              { id: 'somewhatHelpful', label: 'Somewhat' },
              { id: 'notHelpful', label: 'Not helpful' },
            ] as { id: CommunityNoteHelpfulness; label: string }[]).map((opt) => {
              const active = helpfulness === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setHelpfulness(opt.id);
                    // Switching helpfulness invalidates the reason set —
                    // helpful/notHelpful expose different reasons.
                    setReasons(new Set());
                  }}
                  style={[
                    styles.helpfulChip,
                    {
                      borderColor: active ? tint : borderColor,
                      backgroundColor: active ? `${tint}22` : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.helpfulChipLabel,
                      active ? { color: tint, fontWeight: fontWeight.semibold } : null,
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {helpfulness ? (
            <>
              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
                {helpfulness === 'notHelpful' ? 'Why not helpful?' : 'What makes it helpful?'}
              </ThemedText>
              <View style={styles.reasonGrid}>
                {reasonOptions.map((opt) => {
                  const active = reasons.has(opt.id);
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        const next = new Set(reasons);
                        if (active) next.delete(opt.id);
                        else next.add(opt.id);
                        setReasons(next);
                      }}
                      style={[
                        styles.reasonChip,
                        {
                          borderColor: active ? tint : borderColor,
                          backgroundColor: active ? `${tint}22` : 'transparent',
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.reasonChipLabel,
                          active ? { color: tint, fontWeight: fontWeight.semibold } : null,
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
                Anything else?
              </ThemedText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Optional notes for the rating team"
                placeholderTextColor={secondary}
                multiline
                style={[
                  styles.commentInput,
                  { color: textColor, borderColor, backgroundColor: inputBg },
                ]}
              />
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            disabled={rate.isPending}
            style={[styles.footerButton, { borderColor }]}
          >
            <ThemedText style={styles.footerButtonLabel}>Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!helpfulness || rate.isPending}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: tint },
              (!helpfulness || rate.isPending) && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              {rate.isPending ? 'Submitting…' : 'Submit'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
}

function SourcesModal({
  onClose,
  sources,
}: {
  onClose: () => void;
  sources: string[];
}) {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({}, 'tint');

  return (
    <CenteredModal onClose={onClose} maxWidth={520}>
      <View style={styles.modalContents}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.modalTitle}>Sources</ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: secondary }]}>
            Citations attached to this note by the contributor.
          </ThemedText>
        </View>
        <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody}>
          {sources.length === 0 ? (
            <ThemedText style={[styles.modalSubtitle, { color: secondary }]}>
              No sources attached.
            </ThemedText>
          ) : (
            sources.map((url) => (
              <Pressable
                key={url}
                onPress={() => void WebBrowser.openBrowserAsync(url)}
                style={({ pressed }) => [
                  styles.sourceRow,
                  { borderColor },
                  pressed && { opacity: activeOpacity.default },
                ]}
              >
                <IconSymbol name="link" size={14} color={tint} />
                <ThemedText style={[styles.sourceText, { color: tint }]} numberOfLines={2}>
                  {url}
                </ThemedText>
              </Pressable>
            ))
          )}
        </ScrollView>
        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            style={[styles.footerButton, styles.footerButtonPrimary, { backgroundColor: tint }]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              Close
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headline: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  rating: {
    fontSize: fontSize.xs,
    opacity: opacity.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  modalContents: { flex: 1 },
  modalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
  },
  modalBodyScroll: { flex: 1 },
  modalBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  modalFooter: {
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
  helpfulRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  helpfulChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  helpfulChipLabel: {
    fontSize: fontSize.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reasonGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reasonChipLabel: {
    fontSize: fontSize.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sourceText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

