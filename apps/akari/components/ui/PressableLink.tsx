import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type ViewStyle } from 'react-native';

// Min interval between accepted presses on the same link. Guards against
// fast double-taps and any RN/expo-router edge case where a single touch
// fires onPress twice (which pushes the same route twice and forces the
// user to press back twice to get out).
const PRESS_DEBOUNCE_MS = 500;

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
  const lastPressAtRef = useRef(0);

  const handleNativePress = useCallback(
    (event?: GestureResponderEvent) => {
      // Prevent the press from bubbling to a parent PressableLink (e.g. when
      // an avatar or quoted-post link is rendered inside a PostCard's
      // PressableLink).
      event?.stopPropagation?.();
      const now = Date.now();
      if (now - lastPressAtRef.current < PRESS_DEBOUNCE_MS) return;
      lastPressAtRef.current = now;
      if (onPress) {
        onPress();
      } else {
        router.push(href as any);
      }
    },
    [href, onPress],
  );

  if (Platform.OS === 'web') {
    const resolved = typeof style === 'function' ? style({ pressed: false, hovered: false }) : style;
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
