import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { MastodonActionButton } from '@/components/home/MastodonActionButton';
import { semanticColors, spacing } from '@/constants/tokens';
import { useMastodonStatusAction } from '@/hooks/mutations/useMastodonStatusAction';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonStatus } from '@/utils/mastodon/types';

type MastodonPostActionsProps = {
  status: MastodonStatus;
};

/**
 * Mastodon post actions row: reply (visual placeholder until the
 * Mastodon composer lands), boost, favourite, bookmark. Each toggle
 * goes through `useMastodonStatusAction` which optimistically patches
 * every cached timeline + reconciles from the server response.
 *
 * Counts come straight off the status — the optimistic mutation also
 * adjusts them inline, so the displayed count reflects the immediate
 * intent and then snaps to truth when the server confirms.
 */
export function MastodonPostActions({ status }: MastodonPostActionsProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const action = useMastodonStatusAction();
  const accentColor = useThemeColor({}, 'tint');

  const authorName = status.account.display_name || status.account.username;

  const runAction = useCallback(
    async (kind: 'favourite' | 'reblog' | 'bookmark', value: boolean) => {
      try {
        await action.mutateAsync({ statusId: status.id, action: kind, value });
      } catch (err) {
        // `err.message` already carries the server's HTTP code / reason in
        // English; the fallback below is unreachable in practice (the
        // helper always throws a real Error) but keeps TS happy without
        // adding a single-use translation key.
        confirm({
          title: t('common.error'),
          message: err instanceof Error ? err.message : 'Action failed. Please try again.',
          buttons: [{ text: t('common.ok') }],
        });
      }
    },
    [action, confirm, status.id, t],
  );

  return (
    <View style={styles.row}>
      <MastodonActionButton
        icon="bubble.left"
        activeColor={accentColor}
        count={status.replies_count}
        // Reply composer for Mastodon isn't built yet — show the
        // affordance + count so the layout is right, but mark it as
        // disabled rather than swallowing taps silently.
        disabled
        accessibilityLabel={`Reply to post by ${authorName}`}
      />
      <MastodonActionButton
        icon="arrow.2.squarepath"
        isActive={status.reblogged}
        activeColor={semanticColors.repost}
        count={status.reblogs_count}
        onPress={() => runAction('reblog', !status.reblogged)}
        accessibilityLabel={
          status.reblogged
            ? `Unboost post by ${authorName}`
            : `Boost post by ${authorName}`
        }
      />
      <MastodonActionButton
        icon="heart"
        activeIcon="heart.fill"
        isActive={status.favourited}
        activeColor={semanticColors.like}
        count={status.favourites_count}
        onPress={() => runAction('favourite', !status.favourited)}
        accessibilityLabel={
          status.favourited
            ? `Unfavourite post by ${authorName}`
            : `Favourite post by ${authorName}`
        }
      />
      <MastodonActionButton
        icon="bookmark"
        activeIcon="bookmark.fill"
        isActive={Boolean(status.bookmarked)}
        activeColor={semanticColors.bookmark}
        onPress={() => runAction('bookmark', !status.bookmarked)}
        accessibilityLabel={
          status.bookmarked
            ? `Remove bookmark on post by ${authorName}`
            : `Bookmark post by ${authorName}`
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
});
