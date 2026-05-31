import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useMastodonFollow } from '@/hooks/mutations/useMastodonFollow';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonAccount } from '@/utils/mastodon/types';

type MastodonSuggestionRowProps = {
  account: MastodonAccount;
};

/**
 * One suggested-account row on the follow-people-to-get-started screen.
 *
 * State is local: each row tracks its own follow + pending state and
 * shares the mutation hook with the rest. We start at `following=false`
 * because the suggestions endpoint excludes accounts the viewer already
 * follows. Reconcile against the post-action `Relationship` rather than
 * trusting the click, so locked accounts (where the action results in
 * `requested: true`) read as "Requested" instead of "Following."
 */
export function MastodonSuggestionRow({ account }: MastodonSuggestionRowProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const follow = useMastodonFollow();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const labelColor = useThemeColor({ light: '#111827', dark: '#F9FAFB' }, 'text');

  const onToggle = useCallback(async () => {
    const next = !(isFollowing || isRequested);
    // Optimistic: flip the button immediately. Reconcile from the server
    // response (or revert on error).
    setIsFollowing(next);
    try {
      const rel = await follow.mutateAsync({ accountId: account.id, follow: next });
      setIsFollowing(rel.following);
      setIsRequested(rel.requested);
    } catch (err) {
      setIsFollowing(!next);
      setIsRequested(false);
      confirm({
        title: t('common.error'),
        message: err instanceof Error ? err.message : t('auth.onboardingFollowGenericError'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  }, [account.id, confirm, follow, isFollowing, isRequested, t]);

  const buttonLabel = isRequested
    ? t('auth.onboardingFollowRequested')
    : isFollowing
      ? t('auth.onboardingFollowFollowing')
      : t('auth.onboardingFollowFollow');

  const displayName = account.display_name || account.username;

  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <AvatarOrInitial
        uri={account.avatar}
        seed={displayName}
        size={layout.avatarMedium}
      />
      <View style={styles.identity}>
        <ThemedText style={[styles.displayName, { color: labelColor }]} numberOfLines={1}>
          {displayName}
        </ThemedText>
        <ThemedText style={[styles.handle, { color: helperColor }]} numberOfLines={1}>
          @{account.acct}
        </ThemedText>
      </View>
      <Pressable
        onPress={onToggle}
        disabled={follow.isPending}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        style={({ pressed }) => [
          styles.followButton,
          isFollowing || isRequested
            ? { backgroundColor: 'transparent', borderColor }
            : { backgroundColor: semanticColors.systemBlue, borderColor: semanticColors.systemBlue },
          (pressed || follow.isPending) && { opacity: opacity.disabled },
        ]}
      >
        <ThemedText
          style={[
            styles.followButtonText,
            { color: isFollowing || isRequested ? labelColor : '#ffffff' },
          ]}
        >
          {buttonLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  displayName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.sm,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
