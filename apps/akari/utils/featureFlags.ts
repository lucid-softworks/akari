/**
 * In-house feature flags. Keep this file dead-simple — flip a value to roll
 * something out, no MMKV/remote-config needed. If we ever want per-user
 * rollouts we'll layer on a runtime override later.
 *
 * The pattern intentionally keeps each flag as a `const` boolean so dead
 * code elimination can drop disabled branches at build time.
 */
const featureFlags = {
  /**
   * Group chats. Enable once the Bluesky chat service rolls out groups for
   * non-employee accounts. Today, only @bsky.app team accounts can create
   * group convos; the lexicon supports multi-member `getConvoForMembers`
   * but the server returns 4xx for everyone else, so we cap the picker at
   * a single peer until this flips.
   */
  groupChats: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Convenience accessor so call sites read like `if (isFeatureEnabled('groupChats'))`.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
