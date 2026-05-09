import { useMemo } from 'react';

import type { BlueskyLabel } from '@/bluesky-api';
import { adultLabelsOn } from '@/utils/adultLabels';

import { useModerationSettings } from './useModerationSettings';

export type AdultContentDecision = {
  /** What the post-level UI should do with this content. */
  action: 'show' | 'warn' | 'hide';
  /** The triggering labels — used to surface them in the warn overlay. */
  matchedLabels: readonly string[];
};

/**
 * Folds the user's `adultContentPref` setting together with a post's
 * label list into a single rendering decision:
 *
 *   - `'show'`   — no adult labels (or a non-adult post). Render normally.
 *   - `'warn'`   — adult labels present and the user has opted in. Render
 *                  a blurred placeholder with a reveal button.
 *   - `'hide'`   — adult labels present and the user has not opted in.
 *                  Suppress the post from the feed entirely.
 */
export function useAdultContentDecision(
  labels: readonly BlueskyLabel[] | undefined,
): AdultContentDecision {
  const { adultContentEnabled } = useModerationSettings();

  return useMemo<AdultContentDecision>(() => {
    const matched = adultLabelsOn(labels);
    if (matched.length === 0) return { action: 'show', matchedLabels: [] };
    return {
      action: adultContentEnabled ? 'warn' : 'hide',
      matchedLabels: matched,
    };
  }, [adultContentEnabled, labels]);
}
