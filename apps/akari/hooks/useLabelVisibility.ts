import { useMemo } from 'react';

import type { BlueskyContentLabelPref, BlueskyLabel } from '@/bluesky-api';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useModerationSettings } from '@/hooks/useModerationSettings';
import { ADULT_LABEL_VALUES } from '@/utils/adultLabels';

const ADULT_LABEL_SET = new Set<string>(ADULT_LABEL_VALUES);

export type LabelVisibilityDecision = {
  /** What the post-level UI should do with this content. */
  action: 'show' | 'warn' | 'hide';
  /**
   * Label values that triggered the strictest decision (used to surface
   * "Warn because of: nsfw, spam" copy in the gate overlay).
   */
  matchedLabels: readonly string[];
};

function labelValueOf(label: BlueskyLabel): string | null {
  if (label.neg) return null;
  // Bluesky returns labels in the canonical { val } shape; the alternate
  // fields the Labels component tolerates aren't a concern for gating
  // because they only show up in fixtures.
  const value = label.val;
  if (typeof value !== 'string') return null;
  return value.trim();
}

const SHOW: LabelVisibilityDecision = { action: 'show', matchedLabels: [] };

/**
 * Folds the user's content-label preferences against a post's (or
 * profile's) label list and returns a single render decision: `show`,
 * `warn`, or `hide`.
 *
 * Rules (in order):
 *   1. Adult labels (`porn`/`sexual`/`nudity`/`graphic-media`) with
 *      `adultContentEnabled === false` → always `hide`. This is the
 *      "I never want adult content visible" master switch and overrides
 *      per-label overrides.
 *   2. Per-label `contentLabelPref` entries are merged: any `hide`
 *      escalates the whole post to `hide`; otherwise any `warn`
 *      escalates to `warn`.
 *   3. Adult labels with `adultContentEnabled === true` default to
 *      `warn` when the user hasn't set an explicit per-label
 *      preference. (atproto's expected behaviour.)
 *   4. Everything else defaults to `show`.
 *
 * Returns an empty `matchedLabels` list when the action is `show` so
 * callers can early-out without iterating.
 */
export function useLabelVisibility(
  labels: readonly BlueskyLabel[] | undefined,
): LabelVisibilityDecision {
  const { adultContentEnabled } = useModerationSettings();
  const { data: preferences } = usePreferences();

  return useMemo<LabelVisibilityDecision>(() => {
    if (!labels?.length) return SHOW;

    // Build a fast lookup of the user's per-label visibility prefs.
    const prefByLabel = new Map<string, BlueskyContentLabelPref['visibility']>();
    for (const pref of preferences?.preferences ?? []) {
      if (pref.$type === 'app.bsky.actor.defs#contentLabelPref') {
        const cp = pref as BlueskyContentLabelPref;
        prefByLabel.set(cp.label, cp.visibility);
      }
    }

    const matched = new Set<string>();
    let action: 'show' | 'warn' | 'hide' = 'show';

    const escalate = (next: 'warn' | 'hide', value: string) => {
      matched.add(value);
      if (next === 'hide' || action === 'hide') {
        action = 'hide';
      } else if (next === 'warn' && action === 'show') {
        action = 'warn';
      }
    };

    for (const label of labels) {
      const value = labelValueOf(label);
      if (!value) continue;
      const isAdult = ADULT_LABEL_SET.has(value);

      if (isAdult && !adultContentEnabled) {
        // Master adult-off switch — no per-label override survives this.
        escalate('hide', value);
        continue;
      }

      const userPref = prefByLabel.get(value);
      if (userPref === 'hide') {
        escalate('hide', value);
        continue;
      }
      if (userPref === 'warn') {
        escalate('warn', value);
        continue;
      }
      if (userPref === 'show' || userPref === 'ignore') {
        // Explicit "show" / "ignore" suppresses the default warn even
        // for adult labels (the user has opted in to seeing them raw).
        continue;
      }
      // No explicit preference — adult labels default to warn so the
      // user has to opt in per-post, everything else defaults to show.
      if (isAdult) {
        escalate('warn', value);
      }
    }

    if (action === 'show') return SHOW;
    return { action, matchedLabels: Array.from(matched) };
  }, [labels, adultContentEnabled, preferences]);
}
