import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { radius } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

type ProfileTabIconProps = {
  color: string;
  focused: boolean;
  avatarUri?: string;
};

export function ProfileTabIcon({ color, focused, avatarUri }: ProfileTabIconProps) {
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'border');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const placeholderColor = useThemeColor({ light: '#D1D5DB', dark: '#1F2937' }, 'background');

  const resolvedBorderColor = focused ? accentColor : borderColor;
  const resolvedBackgroundColor = avatarUri ? 'transparent' : focused ? accentColor : placeholderColor;
  const resolvedIconColor = !avatarUri && focused ? '#FFFFFF' : color;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: resolvedBorderColor,
          backgroundColor: resolvedBackgroundColor,
        },
      ]}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.image} contentFit="cover" />
      ) : (
        <IconSymbol name="person.fill" color={resolvedIconColor} size={18} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: -3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
