import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Label } from '@/components/Label';
import { LabelDetailModal } from '@/components/LabelDetailModal';
import { spacing } from '@/constants/tokens';
import { useLabelers } from '@/hooks/queries/useLabelers';

type LabelData = {
  /** The label text */
  val: string;
  /** The labeler DID that emitted this label */
  src?: string;
  /** When the label was created (ISO 8601) */
  cts?: string;
  /** The label URI (optional) */
  uri?: string;
  /** The label CID (optional - not always present) */
  cid?: string;
  /** Whether the label is negative (cancels a previous label) */
  neg?: boolean;
  /** Alternative label-text fields some sources use */
  value?: string;
  text?: string;
  label?: string;
  ver?: number;
  exp?: string;
};

type LabelsProps = {
  /** Array of label data from the Bluesky API */
  labels?: LabelData[];
  /** Maximum number of labels to display */
  maxLabels?: number;
};

function readLabelText(label: LabelData): string {
  if (label.val) return label.val;
  if (label.value) return label.value;
  if (label.text) return label.text;
  if (label.label) return label.label;
  return '';
}

// Known label classifications. Anything outside these buckets renders as
// neutral. The lists are intentionally conservative — the long tail of
// custom labeler values just shows as a plain chip rather than being
// mis-coloured as "warning" when nobody can guarantee that semantic.
const WARNING_LABELS = new Set([
  'porn', 'sexual', 'nudity', 'graphic-media', 'gore', 'nsfw',
  'spam', 'impersonation', 'misleading', 'scam', 'harm',
  'sexual-figurative', 'extremist', 'rude', 'hate',
]);
const POSITIVE_LABELS = new Set([
  'verified', 'official', 'trusted',
]);

function classify(text: string): { isWarning: boolean; isPositive: boolean } {
  const lower = text.toLowerCase();
  if (WARNING_LABELS.has(lower) || lower.startsWith('!')) {
    return { isWarning: true, isPositive: false };
  }
  if (POSITIVE_LABELS.has(lower)) {
    return { isWarning: false, isPositive: true };
  }
  return { isWarning: false, isPositive: false };
}

/**
 * Renders a row of moderation labels. Tapping any chip opens the
 * `LabelDetailModal` with the full record (value, labeler DID, timestamp,
 * negation flag) so the user can dig into what triggered it.
 */
export function Labels({ labels, maxLabels = 5 }: LabelsProps) {
  const [openLabel, setOpenLabel] = useState<LabelData | null>(null);
  // Resolve each label's `src` (DID) to the labeler's avatar so the chip
  // can show who applied it — matching the official Bluesky client's
  // pattern of using the labeler's avatar as the chip "icon". Falls back
  // to the per-kind glyph in <Label> when the labeler isn't in the
  // user's subscribed list (`useLabelers` only knows about those).
  const { data: labelerViews } = useLabelers();
  const avatarByDid = useMemo(() => {
    const map = new Map<string, string>();
    for (const view of labelerViews ?? []) {
      const did = view.creator?.did;
      const avatar = view.creator?.avatar;
      if (did && avatar) map.set(did, avatar);
    }
    return map;
  }, [labelerViews]);

  if (!labels || labels.length === 0) {
    return null;
  }

  // Filter out empty / negated labels, then cap. Negated labels are
  // tombstones — they undo a previous label, not something to display.
  const display = labels.filter((label) => {
    const text = readLabelText(label);
    return text.trim() !== '' && !label.neg;
  }).slice(0, maxLabels);

  if (display.length === 0) return null;

  return (
    <View style={styles.container}>
      {display.map((label, index) => {
        const text = readLabelText(label);
        const { isWarning, isPositive } = classify(text);
        const labelerAvatar = label.src ? avatarByDid.get(label.src) : undefined;
        // A single subject (account or post) can carry multiple labels
        // from the same labeler — they all share `label.uri` (the
        // subject) and `label.cid`, so neither is unique enough on its
        // own. The key has to include the label value too.
        return (
          <Label
            key={`${label.src ?? 'src'}|${text}|${label.uri ?? ''}|${label.cid ?? index}`}
            text={text}
            isWarning={isWarning}
            isPositive={isPositive}
            labelerAvatar={labelerAvatar}
            onPress={() => setOpenLabel(label)}
          />
        );
      })}
      {openLabel ? (
        <LabelDetailModal
          label={openLabel}
          isWarning={classify(readLabelText(openLabel)).isWarning}
          isPositive={classify(readLabelText(openLabel)).isPositive}
          onDismiss={() => setOpenLabel(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    // No top margin — sits flush under the post header. The bottom
    // margin restores the standard content-padding gap between the
    // labels row and the post body underneath.
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
});
