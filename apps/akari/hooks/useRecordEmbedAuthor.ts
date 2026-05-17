import type { BlueskyEmbed, BlueskyRecord, BlueskyVerification } from '@/bluesky-api';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';

import {
  detectUnavailableKind,
  getViewerForRecord,
  pickAuthorIdentifier,
  type UnavailableKind,
} from '@/components/RecordEmbed/recordEmbedUtils';

type RecordEmbedShape = BlueskyEmbed & {
  record: BlueskyRecord;
  media?: BlueskyEmbed;
};

export type ResolvedRecordEmbedAuthor = {
  did?: string;
  handle: string;
  displayName: string;
  avatar?: string;
  verification?: BlueskyVerification;
};

/**
 * Resolves the quoted post author, the blocking-state message, and the
 * "unavailable" kind from a record-embed shape. Bundled into one hook so
 * the RecordEmbed component itself stays focused on rendering.
 */
export function useRecordEmbedAuthor(embed: RecordEmbedShape) {
  const { t } = useTranslation();
  const authorIdentifier = pickAuthorIdentifier(embed);
  const { data: profileData } = useProfile(authorIdentifier);

  const unavailableKind: UnavailableKind = detectUnavailableKind(embed);
  const isBlockedRecord = unavailableKind === 'blocked';

  // Get author information from available sources. We prefer whatever
  // identifier is on the record itself (handle when present, falling back
  // to DID), then upgrade with the resolved profile from useProfile when
  // it lands.
  const author =
    embed.record.author ||
    embed.record.record?.author ||
    embed.record.record?.record?.author;

  let authorInfo: ResolvedRecordEmbedAuthor | null = null;
  if (author?.handle) {
    authorInfo = {
      did: author.did,
      handle: author.handle,
      displayName: author.displayName || author.handle,
      avatar: author.avatar,
      verification: author.verification,
    };
  } else if (profileData) {
    authorInfo = {
      did: profileData.did,
      handle: profileData.handle,
      displayName: profileData.displayName || profileData.handle,
      avatar: profileData.avatar,
      verification: profileData.verification,
    };
  } else {
    const did =
      author?.did ||
      embed.record.record?.author?.did ||
      embed.record.record?.record?.author?.did;
    if (did) {
      authorInfo = {
        did,
        handle: did,
        displayName: did,
        avatar: undefined,
        verification: undefined,
      };
    }
  }

  // Determine the blocking scenario
  let blockingMessage: string | null = null;
  if (isBlockedRecord) {
    const viewer = getViewerForRecord(embed);
    if (viewer) {
      const { blockedBy, blocking } = viewer;
      if (blockedBy && blocking) {
        blockingMessage = t('profile.mutualBlock');
      } else if (blockedBy) {
        blockingMessage = t('profile.youAreBlockedByUser');
      } else if (blocking) {
        blockingMessage = t('profile.youHaveBlockedUser');
      }
    }
  }

  return { authorInfo, blockingMessage, unavailableKind, isBlockedRecord };
}
