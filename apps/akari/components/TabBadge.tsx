import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { spacing, fontSize, fontWeight } from '@/constants/tokens';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type TabBadgeProps = {
  count: number;
  size?: 'small' | 'medium';
};

export function TabBadge({ count, size = 'medium' }: TabBadgeProps) {
  const backgroundColor = Platform.OS === 'ios' ? '#ff3b30' : '#ff453a';
  const textColor = '#ffffff';

  // Don't show badge if count is 0
  if (count === 0) {
    return null;
  }

  const styles = size === 'small' ? smallStyles : mediumStyles;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <ThemedText style={[styles.text, { color: textColor }]}>{count > 99 ? '99+' : count.toString()}</ThemedText>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs + 2,
    // iOS-specific positioning to avoid background issues
    top: Platform.OS === 'ios' ? -spacing.sm : -5,
    right: Platform.OS === 'ios' ? -spacing.sm : -5,
    // Add shadow for better visibility on iOS blur background
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
      },
      default: {},
    }),
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});

const smallStyles = StyleSheet.create({
  ...baseStyles,
  badge: {
    ...baseStyles.badge,
    minWidth: spacing.lg,
    height: spacing.lg,
    paddingHorizontal: spacing.xs,
    // Adjust positioning for small badges
    top: Platform.OS === 'ios' ? -6 : -spacing.xs,
    right: Platform.OS === 'ios' ? -6 : -spacing.xs,
  },
  text: {
    ...baseStyles.text,
    fontSize: 10,
  },
});

const mediumStyles = StyleSheet.create({
  ...baseStyles,
  badge: {
    ...baseStyles.badge,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs + 2,
  },
  text: {
    ...baseStyles.text,
    fontSize: fontSize.sm,
  },
});
