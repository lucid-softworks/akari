import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerifiersSheet } from '@/components/VerifiersSheet';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hitSlop } from '@/constants/tokens';
import { useVerifiersForDid } from '@/hooks/queries/useVerifiersForDid';
import { useTranslation } from '@/hooks/useTranslation';
import { useVerificationSettings } from '@/hooks/useVerificationSettings';

type VerificationBadgeProps = {
  /** Subject's DID — required for the Constellation back-reference lookup. */
  subjectDid?: string;
  /**
   * Appview-supplied verification state. Optional now — Constellation drives
   * the badge tier; this is still used to pre-populate the sheet's rich rows.
   */
  verification?: BlueskyVerification;
  /** The handle of the account this badge represents (used as the sheet title). */
  subjectHandle?: string;
  /** The display name of the account (used as the sheet title). */
  subjectDisplayName?: string;
  /** Icon size in points (defaults to 14, matching inline text size). */
  size?: number;
  /** Whether the badge can be tapped to open the verifier list. Defaults to true. */
  interactive?: boolean;
};

const VERIFIED_BLUE = '#0085ff';
const VERIFIED_SILVER = '#C0C0C0';
const VERIFIED_GOLD = '#FFC629';

export type VerificationTier = 'none' | 'blue' | 'silver' | 'gold';

/**
 * Compute the badge tier for a subject, given the union of verifier DIDs
 * (appview + Constellation) and the user's personal trusted-verifier list.
 *
 * - none   — nobody has issued a verification record for this subject
 * - blue   — verifications exist but none from anyone in the user's list
 * - silver — at least one of the user's trusted verifiers vouched, or the
 *            list has only one entry (gold needs a quorum to mean something)
 * - gold   — the user's list has 2+ entries and every one of them vouched
 */
export function computeVerificationTier(
  allVerifierDids: readonly string[],
  trustedVerifierDids: readonly string[],
): VerificationTier {
  if (allVerifierDids.length === 0) return 'none';
  if (trustedVerifierDids.length === 0) return 'blue';

  const trustedSet = new Set(trustedVerifierDids);
  const matched = allVerifierDids.reduce(
    (count, did) => (trustedSet.has(did) ? count + 1 : count),
    0,
  );

  if (matched === 0) return 'blue';
  // Gold requires consensus from a meaningful list — with a single trusted
  // verifier it would collapse onto silver, so bump the threshold to >= 2.
  if (matched === trustedVerifierDids.length && trustedVerifierDids.length >= 2) return 'gold';
  return 'silver';
}

/**
 * Inline verification check shown next to a user's display name. Tapping opens
 * a sheet listing all verifiers (appview + Constellation), grouped by whether
 * the user trusts them.
 */
export function VerificationBadge({
  subjectDid,
  verification,
  subjectHandle,
  subjectDisplayName,
  size = 14,
  interactive = true,
}: VerificationBadgeProps) {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { badgesEnabled, trustedVerifierDids } = useVerificationSettings();
  const { data: constellationDids } = useVerifiersForDid(badgesEnabled ? subjectDid : undefined);

  const allVerifierDids = useMemo(() => {
    const appviewDids = (verification?.verifications ?? []).flatMap((v) => (v.isValid ? [v.issuer] : []));
    return Array.from(new Set([...appviewDids, ...(constellationDids ?? [])]));
  }, [verification, constellationDids]);

  const tier = useMemo(
    () => computeVerificationTier(allVerifierDids, trustedVerifierDids),
    [allVerifierDids, trustedVerifierDids],
  );

  if (!badgesEnabled || tier === 'none') return null;

  const color = tier === 'gold' ? VERIFIED_GOLD : tier === 'silver' ? VERIFIED_SILVER : VERIFIED_BLUE;
  const accessibilityLabel =
    tier === 'gold'
      ? t('ui.verifiedBadgeGold')
      : tier === 'silver'
        ? t('ui.verifiedBadgeSilver')
        : t('ui.verifiedBadge');

  const icon = <IconSymbol name="checkmark.seal.fill" size={size} color={color} />;

  if (!interactive) {
    return (
      <View accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={styles.wrapper}>
        {icon}
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('ui.verifiedBadgeHint')}
        hitSlop={hitSlop}
        style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.7 }]}
      >
        {icon}
      </Pressable>
      <VerifiersSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        subjectDid={subjectDid}
        verification={verification}
        subjectHandle={subjectHandle}
        subjectDisplayName={subjectDisplayName}
        tier={tier}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
