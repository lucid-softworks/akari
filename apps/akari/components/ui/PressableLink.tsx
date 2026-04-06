import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

type PressableLinkProps = {
  href: string;
  onPress?: () => void;
  style?: PressableProps['style'];
  hoverStyle?: ViewStyle;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
};

export function PressableLink({
  href,
  onPress,
  style,
  hoverStyle,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: PressableLinkProps) {
  const [hovered, setHovered] = useState(false);

  const handleNativePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
    const flatStyle = StyleSheet.flatten(resolved);

    return (
      <a
        href={href}
        ref={(aRef) => {
          if (!aRef) return;
          aRef.onclick = (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            router.push(href as any);
          };
        }}
        style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}
        aria-label={accessibilityLabel}
      >
        <Pressable
          style={[flatStyle, hovered && hoverStyle]}
          accessibilityRole={accessibilityRole ?? 'link'}
          accessibilityState={accessibilityState}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {children}
        </Pressable>
      </a>
    );
  }

  return (
    <Pressable
      onPress={handleNativePress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
