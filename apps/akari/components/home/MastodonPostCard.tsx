import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { MastodonPostActions } from '@/components/home/MastodonPostActions';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';
import { toFullAcct } from '@/utils/mastodon/handle';
import { htmlToPlainText } from '@/utils/mastodon/html';
import type { MastodonStatus } from '@/utils/mastodon/types';

type MastodonPostCardProps = {
  status: MastodonStatus;
};

// Avatar column geometry — body / actions sit in a sibling column offset
// by the avatar width + 8px gap so everything below the author row aligns
// under the display name (matches the atproto PostCard's layout exactly).
const AVATAR_COLUMN_OFFSET = layout.avatarMedium + spacing.sm;

/**
 * Card for a single Mastodon status. Layout mirrors the atproto PostCard:
 * the header row sits at the top with the avatar at the left edge and the
 * author info next to it; the body text and actions bar below sit in a
 * sibling column indented past the avatar so they align under the
 * display name. Avatars use a squircle (rounded square) instead of a
 * circle — matches the Mastodon web client convention and distinguishes
 * Mastodon entries visually in a future mixed feed.
 *
 * Press handling: tapping the body opens the in-app status detail
 * screen (`/mastodon/status/[id]`); tapping the avatar opens the in-app
 * profile screen (`/mastodon/profile/[id]`). Pressables nest cleanly in
 * RN, so the avatar's onPress intercepts the touch before the card's
 * onPress sees it — no need for explicit stopPropagation.
 *
 * Still missing (each its own follow-up): media attachments, polls,
 * content warnings (`spoiler_text` is dropped, not hidden), custom emoji,
 * mention/hashtag/url facet linking.
 */
export function MastodonPostCard({ status }: MastodonPostCardProps) {
  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();
  const { data: currentAccount } = useCurrentAccount();
  const borderColor = useBorderColor();
  const helperColor = '#9CA3AF';
  // Match the atproto PostCard's web column-edge borders so a mixed feed
  // (today: Mastodon only, but the dispatcher is shared) paints one
  // continuous column down the screen. The helper returns `null` on
  // native, so the spread is a no-op there.
  const webSideBorders = webColumnSideBorders(borderColor);
  // Mastodon boosts wrap the original status in `reblog`; render the inner
  // status as the body and the outer account as the "boosted by" header.
  const isBoost = status.reblog !== null;
  const body = isBoost ? status.reblog! : status;
  const booster = isBoost ? status.account : null;

  const authorName = body.account.display_name || body.account.username;
  const content = htmlToPlainText(body.content);

  // Build the federated handle (`alice@instance`) so both URLs round-
  // trip through `/accounts/lookup` on any viewer's instance. Local
  // accts on the viewer's instance only carry `alice`, so we append
  // the viewer host to make the URL shareable. The shared
  // `/profile/<handle>(/post/<rkey>)` routes dispatch on `@` to pick
  // the Mastodon vs atproto view inside `ProfileView` / `PostDetailView`.
  const fullAcct = toFullAcct(body.account, currentAccount?.mastodon?.instanceUrl);

  const onCardPress = useCallback(() => {
    if (!fullAcct) return;
    navigateToPost({ actor: fullAcct, rKey: body.id });
  }, [body.id, fullAcct, navigateToPost]);

  const onAvatarPress = useCallback(() => {
    if (!fullAcct) return;
    navigateToProfile({ actor: fullAcct });
  }, [fullAcct, navigateToProfile]);

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }, webSideBorders]}>
      {booster ? (
        <View style={styles.boostHeader}>
          <ThemedText style={styles.boostText} numberOfLines={1}>
            {(booster.display_name || booster.username) + ' boosted'}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={onCardPress}
        accessibilityRole="link"
        accessibilityLabel={`Open post by ${authorName}`}
        style={({ pressed }) => [styles.body, pressed && { opacity: activeOpacity.subtle }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.authorSection}>
            <Pressable
              onPress={onAvatarPress}
              accessibilityRole="link"
              accessibilityLabel={`Open profile for ${authorName}`}
              style={({ pressed }) => [pressed && { opacity: activeOpacity.subtle }]}
            >
              <AvatarOrInitial
                uri={body.account.avatar}
                seed={authorName}
                size={layout.avatarMedium}
                // Squircle, not a circle — see the docblock. Overrides
                // AvatarOrInitial's default `size/2` borderRadius.
                style={{ borderRadius: radius.sm }}
              />
            </Pressable>
            <View style={styles.authorInfo}>
              <View style={styles.displayNameRow}>
                <ThemedText style={styles.displayName} numberOfLines={1}>
                  {authorName}
                </ThemedText>
              </View>
              <ThemedText style={[styles.handle, { color: helperColor }]} numberOfLines={1}>
                @{body.account.acct}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.timestamp, { color: helperColor }]}>
            {formatRelativeTime(body.created_at)}
          </ThemedText>
        </View>

        {content ? (
          <View style={styles.contentColumn}>
            <ThemedText style={styles.bodyText}>{content}</ThemedText>
          </View>
        ) : null}
      </Pressable>

      {/* Actions live OUTSIDE the card Pressable so action taps (boost,
          favourite, bookmark) don't double-fire the "open status" press. */}
      <View style={[styles.contentColumn, styles.actionsContainer]}>
        <MastodonPostActions status={body} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: layout.hairline,
    gap: spacing.sm,
  },
  body: {
    gap: spacing.sm,
  },
  boostHeader: {
    paddingLeft: AVATAR_COLUMN_OFFSET,
  },
  boostText: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  handle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  timestamp: {
    fontSize: fontSize.sm,
    opacity: opacity.tertiary,
  },
  contentColumn: {
    paddingLeft: AVATAR_COLUMN_OFFSET,
  },
  bodyText: {
    fontSize: fontSize.lg,
    lineHeight: 24,
  },
  actionsContainer: {
    paddingTop: 0,
  },
});
