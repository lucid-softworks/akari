import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerifiersSheet } from '@/components/VerifiersSheet';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hitSlop } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type VerificationBadgeProps = {
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

export function isVerified(verification?: BlueskyVerification): boolean {
  if (!verification) return false;
  return verification.verifiedStatus === 'valid' || verification.trustedVerifierStatus === 'valid';
}

/**
 * Inline verification check shown next to a user's display name. Tapping opens
 * a sheet listing the verifiers that signed off on the account.
 */
export function VerificationBadge({
  verification,
  subjectHandle,
  subjectDisplayName,
  size = 14,
  interactive = true,
}: VerificationBadgeProps) {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!isVerified(verification) || !verification) return null;

  const isTrustedVerifier = verification.trustedVerifierStatus === 'valid';
  const accessibilityLabel = isTrustedVerifier ? t('ui.trustedVerifierBadge') : t('ui.verifiedBadge');

  const icon = (
    <IconSymbol name="checkmark.seal.fill" size={size} color={VERIFIED_BLUE} />
  );

  if (!interactive) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={styles.wrapper}
      >
        {icon}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('ui.verifiedBadgeHint')}
        hitSlop={hitSlop}
        style={styles.wrapper}
      >
        {icon}
      </TouchableOpacity>
      <VerifiersSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        verification={verification}
        subjectHandle={subjectHandle}
        subjectDisplayName={subjectDisplayName}
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
