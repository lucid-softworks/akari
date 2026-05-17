import { StyleSheet, View } from 'react-native';

import type { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { RecordEmbedBody } from '@/components/RecordEmbed/RecordEmbedBody';
import { RecordEmbedHeader } from '@/components/RecordEmbed/RecordEmbedHeader';
import { resolveQuotedRefs } from '@/components/RecordEmbed/recordEmbedUtils';
import { UnavailableRecord } from '@/components/RecordEmbed/UnavailableRecord';
import { layout, radius } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useRecordEmbedAuthor } from '@/hooks/useRecordEmbedAuthor';
import { PressableLink } from '@/components/ui/PressableLink';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';

type RecordEmbedProps = {
  /** Record embed data from Bluesky */
  embed: BlueskyEmbed & {
    record: BlueskyRecord;
    media?: BlueskyEmbed;
  };
};

/**
 * Component to display record embeds (quoted posts).
 *
 * Dispatches to the appropriate sub-component:
 * - {@link UnavailableRecord} for blocked / deleted / detached records
 *   (or anything where we can't resolve an author at all).
 * - Normal quote card composed of {@link RecordEmbedHeader} and
 *   {@link RecordEmbedBody} otherwise.
 */
export function RecordEmbed({ embed }: RecordEmbedProps) {
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();

  const { postActor, postRKey, postHref, authorHref } = resolveQuotedRefs(embed);
  const { authorInfo, blockingMessage, unavailableKind, isBlockedRecord } =
    useRecordEmbedAuthor(embed);

  // Unavailable variants (blocked / not found / detached) get a minimal
  // placeholder. Same when we couldn't resolve any author info at all —
  // the normal author header would be empty otherwise.
  if (unavailableKind || !authorInfo) {
    const kind = unavailableKind ?? 'unknown';
    // Show the handle whenever we know it — even when it duplicates the
    // display name, it's still useful context for the reader.
    const handleLabel = authorInfo?.handle
      ? authorInfo.handle.startsWith('did:')
        ? authorInfo.handle
        : `@${authorInfo.handle}`
      : null;
    return (
      <UnavailableRecord
        kind={kind}
        handleLabel={handleLabel}
        blockingMessage={blockingMessage}
      />
    );
  }

  const handlePress = () => {
    if (postActor && postRKey) {
      navigateToPost({ actor: postActor, rKey: postRKey });
    }
  };

  const handleAuthorPress = () => {
    if (postActor) {
      navigateToProfile({ actor: postActor });
    }
  };

  return (
    <PressableLink href={postHref} onPress={handlePress} style={{ opacity: 1 }}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <RecordEmbedHeader
          authorInfo={authorInfo}
          authorHref={authorHref}
          blockingMessage={blockingMessage}
          indexedAt={embed.record.indexedAt}
          onAuthorPress={handleAuthorPress}
        />
        {!isBlockedRecord ? <RecordEmbedBody embed={embed} /> : null}
      </View>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    marginTop: 6,
    overflow: 'hidden',
  },
});
