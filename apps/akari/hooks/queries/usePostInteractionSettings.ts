import { useMemo } from 'react';

import { type BlueskyPostInteractionSettingsPref } from '@/bluesky-api';

import { usePreferences } from './usePreferences';

const PREF_TYPE = 'app.bsky.actor.defs#postInteractionSettingsPref';

export type WhoCanReplyMode = 'anyone' | 'nobody';

export type DerivedPostInteractionSettings = {
  mode: WhoCanReplyMode;
  followers: boolean;
  following: boolean;
  mentioned: boolean;
  allowQuotes: boolean;
};

const DEFAULTS: DerivedPostInteractionSettings = {
  mode: 'anyone',
  followers: false,
  following: false,
  mentioned: false,
  allowQuotes: true,
};

/**
 * Decodes the user's `postInteractionSettingsPref` into the form-state
 * shape the Interaction Settings screen renders. atproto's threadgate
 * allow-rules are tagged unions; we fold them into the akari
 * "anyone | nobody + checkboxes" model.
 */
export function usePostInteractionSettings(): {
  data: DerivedPostInteractionSettings;
  isLoading: boolean;
} {
  const result = usePreferences() ?? {};
  const { data, isLoading = false } = result as {
    data?: { preferences: { $type: string }[] };
    isLoading?: boolean;
  };

  const decoded = useMemo<DerivedPostInteractionSettings>(() => {
    if (!data) return DEFAULTS;
    const pref = data.preferences.find(
      (p): p is BlueskyPostInteractionSettingsPref => p.$type === PREF_TYPE,
    );
    if (!pref) return DEFAULTS;

    const allowRules = pref.threadgateAllowRules;
    let mode: WhoCanReplyMode = 'anyone';
    let followers = false;
    let following = false;
    let mentioned = false;

    if (Array.isArray(allowRules)) {
      // Empty array == "nobody" in atproto threadgate semantics.
      if (allowRules.length === 0) {
        mode = 'nobody';
      } else {
        mode = 'anyone';
        for (const rule of allowRules) {
          const t = rule?.$type;
          if (typeof t !== 'string') continue;
          if (t.endsWith('#followerRule')) followers = true;
          else if (t.endsWith('#followingRule')) following = true;
          else if (t.endsWith('#mentionRule')) mentioned = true;
        }
      }
    }

    const disableQuotes = pref.postgateEmbeddingRules?.some(
      (rule) => typeof rule?.$type === 'string' && rule.$type.endsWith('#disableRule'),
    );

    return {
      mode,
      followers,
      following,
      mentioned,
      allowQuotes: !disableQuotes,
    };
  }, [data]);

  return { data: decoded, isLoading };
}
