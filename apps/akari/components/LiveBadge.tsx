import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { activeOpacity, fontSize, fontWeight, hitSlop, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type LiveBadgeProps = {
  /** When provided, the badge becomes tappable (e.g. to edit your own status). */
  onPress?: () => void;
};

/**
 * Small red "LIVE" pill shown next to a profile's display name while the
 * account is broadcasting via `app.bsky.actor.status`. Visual language
 * matches the LIVE pill on live post cards.
 */
export function LiveBadge({ onPress }: LiveBadgeProps) {
  const { t } = useTranslation();

  const content = (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <ThemedText style={styles.text}>{t('live.badge')}</ThemedText>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={t('live.editStatus')}
      style={({ pressed }) => (pressed ? { opacity: activeOpacity.default } : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: '#ef4444',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  text: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
});
