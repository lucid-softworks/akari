import { Link } from 'expo-router';
import React from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressableLinkProps = {
  href: string;
  onPress?: () => void;
  style?: PressableProps['style'];
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
};

/**
 * On web, renders as an <a> tag via expo-router's Link for proper
 * browser behavior (hover preview, cmd+click, right-click menu).
 * On native, renders as a Pressable with router.push.
 */
export function PressableLink({
  href,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: PressableLinkProps) {
  if (Platform.OS === 'web') {
    return (
      <Link
        href={href as any}
        asChild={false}
        style={typeof style === 'function' ? style({ pressed: false }) : style}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'link'}
      >
        {children}
      </Link>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
