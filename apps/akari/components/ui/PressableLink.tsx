import { Link } from 'expo-router';
import React from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';

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
 * On web, wraps a Pressable inside a Link for proper <a> tag behavior
 * (hover preview, cmd+click, right-click menu) while keeping Pressable
 * layout. On native, renders as a plain Pressable.
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
      <Link href={href as any} asChild>
        <Pressable
          style={style}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={accessibilityRole ?? 'link'}
          accessibilityState={accessibilityState}
        >
          {children}
        </Pressable>
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
