import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type TabBadgeProps = {
  count: number;
  size?: 'small' | 'medium';
};

export function TabBadge({ count, size = 'medium' }: TabBadgeProps) {
  const backgroundColor = useThemeColor(
    {
      light: '#ff3b30',
      dark: '#ff453a',
    },
    'tint',
  );

  const textColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#ffffff',
    },
    'text',
  );

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
