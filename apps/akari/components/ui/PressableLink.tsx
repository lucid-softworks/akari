import { router, usePathname } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type ViewStyle } from 'react-native';

const stripQueryAndHash = (url: string) => url.split('?')[0].split('#')[0];

// Min interval between accepted presses anywhere in the app. Guards against
// fast double-taps and any RN/expo-router edge case where a single touch
// fires onPress twice (which pushes the same route twice and forces the
// user to press back twice to get out). Tracked at module scope so it
// survives across PressableLink instances — a feed re-render between two
// taps can otherwise hand the second tap to a fresh ref starting at 0.
const PRESS_DEBOUNCE_MS = 600;
let lastPressAt = 0;

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
  const pathname = usePathname() as string;

  const handleNativePress = useCallback(
    (event?: GestureResponderEvent) => {
      // Prevent the press from bubbling to a parent PressableLink (e.g. when
      // an avatar or quoted-post link is rendered inside a PostCard's
      // PressableLink).
      event?.stopPropagation?.();
      const now = Date.now();
      if (now - lastPressAt < PRESS_DEBOUNCE_MS) return;
      lastPressAt = now;
      if (onPress) {
        onPress();
        return;
      }
      // Skip pushing if we're already on this exact route — otherwise the
      // user has to press back once for every redundant push.
      if (stripQueryAndHash(href) === stripQueryAndHash(pathname)) {
        return;
      }
      router.push(href as any);
    },
    [href, onPress, pathname],
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
            const now = Date.now();
            if (now - lastPressAt < PRESS_DEBOUNCE_MS) return;
            lastPressAt = now;
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
