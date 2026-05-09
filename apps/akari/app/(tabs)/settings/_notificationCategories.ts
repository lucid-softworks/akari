import { type BlueskyNotificationPreferences } from '@/bluesky-api';

/**
 * Akari's UI categories on the notifications screen, mapped to their
 * primary `app.bsky.notification.putPreferencesV2` lexicon key. Each
 * row's detail page uses this map to read + write the right slot.
 *
 * Some lexicon-level categories (verified, unverified, starterpackJoined,
 * subscribedPost, chat) don't have their own UI row in Bluesky's
 * settings; we group them under "Activity from others" / "Everything
 * else" by picking a representative key for the row's editor.
 */
export type CategoryKey =
  | 'likes'
  | 'newFollowers'
  | 'replies'
  | 'mentions'
  | 'quotes'
  | 'reposts'
  | 'activityFromOthers'
  | 'likesOfYourReposts'
  | 'repostsOfYourReposts'
  | 'everythingElse';

export type CategoryKind = 'filterable' | 'chat' | 'listPush';

export type CategoryDef = {
  /** Lexicon key inside `BlueskyNotificationPreferences`. */
  lexiconKey: keyof BlueskyNotificationPreferences;
  kind: CategoryKind;
};

export const CATEGORY_DEFS: Record<CategoryKey, CategoryDef> = {
  likes: { lexiconKey: 'like', kind: 'filterable' },
  newFollowers: { lexiconKey: 'follow', kind: 'filterable' },
  replies: { lexiconKey: 'reply', kind: 'filterable' },
  mentions: { lexiconKey: 'mention', kind: 'filterable' },
  quotes: { lexiconKey: 'quote', kind: 'filterable' },
  reposts: { lexiconKey: 'repost', kind: 'filterable' },
  activityFromOthers: { lexiconKey: 'subscribedPost', kind: 'listPush' },
  likesOfYourReposts: { lexiconKey: 'likeViaRepost', kind: 'filterable' },
  repostsOfYourReposts: { lexiconKey: 'repostViaRepost', kind: 'filterable' },
  everythingElse: { lexiconKey: 'starterpackJoined', kind: 'listPush' },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_DEFS) as CategoryKey[];

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === 'string' && (CATEGORY_KEYS as string[]).includes(value);
}
