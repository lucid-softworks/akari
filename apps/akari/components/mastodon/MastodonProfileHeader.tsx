import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { ProfileBanner } from '@/components/ProfileHeader/ProfileBanner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { htmlToPlainText } from '@/utils/mastodon/html';
import type { MastodonAccount } from '@/utils/mastodon/types';

type MastodonProfileHeaderProps = {
  account: MastodonAccount;
};

const numberFormatters = new Map<string, Intl.NumberFormat>();

function formatNumber(num: number, locale: string): string {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    // oxlint-disable-next-line react-doctor/js-hoist-intl -- cached per-locale; locale is dynamic, can't hoist to module scope
    formatter = new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' });
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(num);
}

/**
 * Filter out Mastodon's placeholder asset URLs (`…/missing.png` for
 * banners and avatars). The shared `ProfileBanner` would otherwise paint
 * a blank stretched image; passing `undefined` lets it render its own
 * "no banner" placeholder instead.
 */
function withoutPlaceholder(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.endsWith('missing.png') ? undefined : url;
}

/**
 * Mastodon profile header that visually mirrors the atproto
 * `ProfileHeader`: shared `ProfileBanner`, a circular-ish avatar
 * overlapping the bottom of the banner (squircle, matching the
 * Mastodon-web convention), an identity row with display name + handle
 * (follow button still TODO until we wire `useMastodonRelationship`),
 * inline "X posts • Y followers • Z following" stats text, and the
 * description below. Same outer chrome + column-edge borders as
 * `ProfileHeader` so the two profiles look identical down to the
 * spacing on web.
 *
 * Reuses `ProfileBanner` directly. Reuse of `ProfileAvatar` is held off
 * because that component hardcodes a circular shape (`borderRadius:
 * size/2`) — Mastodon convention is squircle, and `AvatarOrInitial` +
 * a `borderRadius` override gives us the right shape without bending
 * the atproto component to take a `shape` prop it doesn't need today.
 */
export function MastodonProfileHeader({ account }: MastodonProfileHeaderProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const borderColor = useBorderColor();
  const avatarBorderColor = useThemeColor({}, 'background');

  const displayName = account.display_name || account.username;
  const bio = account.note ? htmlToPlainText(account.note) : '';

  return (
    <View style={webColumnSideBorders(borderColor)}>
      <ProfileBanner banner={withoutPlaceholder(account.header)} />

      <ThemedView style={[styles.profileHeader, { borderBottomColor: borderColor }]}>
        {/* Avatar overlaps the bottom of the banner (negative top
            margin matches the atproto ProfileAvatar layout). */}
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatarFrame,
              { borderColor: avatarBorderColor },
            ]}
          >
            <AvatarOrInitial
              uri={account.avatar}
              seed={displayName}
              size={layout.avatarLarge - 6}
              style={styles.avatarSquircle}
            />
          </View>
        </View>

        <View style={styles.profileInfoSection}>
          <View style={styles.nameHandleSection}>
            <View style={styles.displayNameRow}>
              <ThemedText style={styles.displayName} numberOfLines={1}>
                {displayName}
              </ThemedText>
            </View>
            <ThemedText style={styles.handle} numberOfLines={1}>
              @{account.acct}
            </ThemedText>
          </View>
          {/* Follow button slot stays empty until
              `useMastodonRelationship` lands — keeping the row shape
              the same as the atproto header so the layout doesn't
              shift when the affordance arrives. */}
        </View>

        <View style={styles.statsContainer}>
          <ThemedText style={styles.statText}>
            {t('profile.posts', {
              count: formatNumber(account.statuses_count ?? 0, currentLocale),
            })}{' '}
            •{' '}
            {t('profile.followers', {
              count: formatNumber(account.followers_count ?? 0, currentLocale),
            })}{' '}
            •{' '}
            {t('profile.following', {
              count: formatNumber(account.following_count ?? 0, currentLocale),
            })}
          </ThemedText>
        </View>

        {bio ? (
          <View style={styles.descriptionContainer}>
            <ThemedText style={styles.description}>{bio}</ThemedText>
          </View>
        ) : null}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches ProfileHeader's `profileHeader` style exactly so the two
  // profiles share spacing + bottom border behaviour.
  profileHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    position: 'relative',
  },
  // Atproto ProfileAvatar uses marginTop: -50 to lift the circular avatar
  // up over the bottom of the 150px banner; mirroring that for symmetry.
  avatarContainer: {
    marginTop: -50,
    marginBottom: spacing.sm,
  },
  avatarFrame: {
    width: layout.avatarLarge,
    height: layout.avatarLarge,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  // Inner avatar matches the outer frame's rounded shape but at a
  // smaller corner radius so the 3px frame reads as a halo, not a
  // squared-off border.
  avatarSquircle: {
    borderRadius: radius.sm,
  },
  profileInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  nameHandleSection: {
    flex: 1,
    marginRight: spacing.sm + spacing.xxs,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  handle: {
    fontSize: 15,
    opacity: opacity.secondary,
  },
  statsContainer: {
    marginBottom: spacing.sm,
  },
  statText: {
    fontSize: 15,
    lineHeight: 20,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  descriptionContainer: {
    marginBottom: spacing.sm,
  },
});
