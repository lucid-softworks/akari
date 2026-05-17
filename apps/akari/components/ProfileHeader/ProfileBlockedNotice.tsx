import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileBlockedNoticeProps = {
  isBlockedBy: boolean | undefined;
  isBlocking: boolean;
  borderColor: string;
};

export function ProfileBlockedNotice({ isBlockedBy, isBlocking, borderColor }: ProfileBlockedNoticeProps) {
  const { t } = useTranslation();
  const mutedTextColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  if (!isBlockedBy && !isBlocking) {
    return null;
  }

  const message = isBlockedBy && isBlocking
    ? t('profile.mutualBlock')
    : isBlockedBy
      ? t('profile.youAreBlockedByUser')
      : t('profile.youHaveBlockedUser');

  return (
    <View style={[styles.blockedMessage, { borderColor }]}>
      <IconSymbol name="hand.raised.fill" size={16} color={mutedTextColor} />
      <ThemedText style={[styles.blockedText, { color: mutedTextColor }]}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  blockedMessage: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  blockedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
