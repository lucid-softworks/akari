import type { BlueskyLabel } from '@/bluesky-api';

/**
 * The four label values Bluesky's central moderation labeler uses to mark
 * adult content. atproto clients honour these by hiding the labelled post
 * (or blurring + warning) depending on the user's `adultContentPref`
 * setting. Matching the upstream client's set keeps cross-client behaviour
 * consistent — a post you blocked on bsky.app will stay blocked here.
 */
export const ADULT_LABEL_VALUES = [
  'porn',
  'sexual',
  'nudity',
  'graphic-media',
] as const;

const ADULT_LABEL_SET = new Set<string>(ADULT_LABEL_VALUES);

/**
 * Reads a label's effective value across the various shapes the Bluesky
 * API returns it in. The `Labels.tsx` component already accepts these
 * fallbacks; we duplicate the same lookup so the gate keeps working even
 * if a code path produces a non-canonical label record.
 */
function labelValueOf(label: BlueskyLabel | { val?: string; value?: string; text?: string; label?: string; neg?: boolean }): string | null {
  if (label.neg) return null;
  const raw = label.val ?? label.value ?? label.text ?? label.label ?? '';
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim();
}

/** Returns the unique adult labels present on the given list, or empty if none. */
export function adultLabelsOn(labels: readonly BlueskyLabel[] | undefined): string[] {
  if (!labels?.length) return [];
  const found = new Set<string>();
  for (const label of labels) {
    const value = labelValueOf(label);
    if (value && ADULT_LABEL_SET.has(value)) {
      found.add(value);
    }
  }
  return Array.from(found);
}

/** True when at least one adult label is present (and not negated). */
export function hasAdultLabel(labels: readonly BlueskyLabel[] | undefined): boolean {
  return adultLabelsOn(labels).length > 0;
}
