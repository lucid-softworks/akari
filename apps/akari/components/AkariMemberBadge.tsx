import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AkariMembersSheet } from '@/components/AkariMembersSheet';
import { Image } from '@/components/Image';
import { activeOpacity, hitSlop } from '@/constants/tokens';
import { useDialogManager } from '@/contexts/DialogContext';
import { useAkariMembers, useIsAkariMember } from '@/hooks/queries/useAkariMembers';

type AkariMemberBadgeProps = {
  /** Subject DID — used to look up membership in the curated list. */
  subjectDid: string | undefined;
  /** Rendered width/height in px. Mirrors `VerificationBadge.size`
   *  so callers can keep both badges in visual lockstep. */
  size?: number;
};

/**
 * Renders the akari "classic" logo next to a user's name when their
 * DID appears in the curated akari members list (see
 * `useAkariMembers`). Returns `null` for non-members and while the
 * membership query is still resolving, so consumers can drop this
 * next to `VerificationBadge` without worrying about layout shift.
 *
 * Tapping the badge opens `AkariMembersSheet`, a thank-you sheet
 * listing every member with their avatar / handle so the user can
 * jump into any of the profiles.
 *
 * The accessibility label is intentionally hard-coded to "akari"
 * rather than going through `useTranslation` — the word is a proper
 * noun and the same in every locale, so a translation key here would
 * just add 36 redundant entries to maintain.
 */
export function AkariMemberBadge({ subjectDid, size = 16 }: AkariMemberBadgeProps) {
  const isMember = useIsAkariMember(subjectDid);
  const { data } = useAkariMembers();
  const dialogManager = useDialogManager();

  const handlePress = useCallback(() => {
    if (!data?.members) return;
    const id = 'akari-members';
    dialogManager.open({
      id,
      component: (
        <AkariMembersSheet
          members={data.members}
          onClose={() => dialogManager.close(id)}
        />
      ),
    });
  }, [data, dialogManager]);

  if (!isMember) return null;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="akari members"
      hitSlop={hitSlop}
      style={({ pressed }) => [pressed && { opacity: activeOpacity.default }]}
    >
      <Image
        // The classic asset doubles as the public favicon, so a single
        // PNG covers both the in-app inline badge and the web tab icon
        // without an extra bundle entry.
        source={require('@/assets/images/logo-classic.png')}
        style={[styles.badge, { width: size, height: size }]}
        accessibilityLabel="akari"
        contentFit="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    // Slight rounding matches the in-app logo treatment so the badge
    // doesn't look like a sharp-edged square next to the soft check.
    borderRadius: 4,
  },
});
