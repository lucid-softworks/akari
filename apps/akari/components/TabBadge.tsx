import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/theme';

type TabBadgeProps = {
  count: number;
  size?: 'small' | 'medium';
};

export function TabBadge({ count, size = 'medium' }: TabBadgeProps) {
  const { colors } = useAppTheme();
  const backgroundColor = colors.danger;
  const textColor = colors.inverseText;

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
    paddingHorizontal: 6,
    // iOS-specific positioning to avoid background issues
    top: Platform.OS === 'ios' ? -8 : -5,
    right: Platform.OS === 'ios' ? -8 : -5,
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
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const smallStyles = StyleSheet.create({
  ...baseStyles,
  badge: {
    ...baseStyles.badge,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    // Adjust positioning for small badges
    top: Platform.OS === 'ios' ? -6 : -4,
    right: Platform.OS === 'ios' ? -6 : -4,
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
    paddingHorizontal: 6,
  },
  text: {
    ...baseStyles.text,
    fontSize: 12,
  },
});
