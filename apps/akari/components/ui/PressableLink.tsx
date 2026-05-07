import { router, usePathname } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { Platform, Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type ViewStyle } from 'react-native';

const stripQueryAndHash = (url: string) => url.split('?')[0].split('#')[0];

// Tracks "are we already inside a PressableLink's <a>?" so that nested
// PressableLinks (e.g. an avatar PressableLink inside a PostCard
// PressableLink) can render as a click-only Pressable on web instead of a
// nested <a>. HTML doesn't allow <a> inside <a>; browsers respond by closing
// the outer anchor early or by dispatching the click against a synthesised
// second anchor, both of which double-fire pushState and pollute history.
//
// Exported so other inline-link components (RichTextWithFacets, etc.) that
// don't use PressableLink directly can still detect "we're already inside an
// anchor" and avoid rendering a nested <a>.
export const NestedAnchorContext = React.createContext(false);

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
      // Same-route short-circuit before *any* handler runs — clicking a link
      // pointing at the URL we're already on must always be a no-op, even if
      // the caller passed a custom onPress (sidebars, account headers, etc.
      // wire side-effects through onPress that would otherwise smuggle a
      // duplicate router.push past the dedupe).
      if (stripQueryAndHash(href) === stripQueryAndHash(pathname)) {
        return;
      }
      if (onPress) {
        onPress();
        return;
      }
      router.push(href as any);
    },
    [href, onPress, pathname],
  );

  const insideAnchor = useContext(NestedAnchorContext);

  if (Platform.OS === 'web') {
    const resolved = typeof style === 'function' ? style({ pressed: false, hovered: false }) : style;
    const flatStyle = StyleSheet.flatten(resolved);

    const handleWebClick = (e: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; preventDefault?: () => void; stopPropagation?: () => void }) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      const now = Date.now();
      if (now - lastPressAt < PRESS_DEBOUNCE_MS) return;
      lastPressAt = now;
      if (stripQueryAndHash(href) === stripQueryAndHash(pathname)) {
        return;
      }
      if (onPress) {
        onPress();
        return;
      }
      router.push(href as any);
    };

    // When already inside a parent PressableLink's <a>, fall back to a
    // click-only Pressable. We forfeit the middle-click-opens-in-new-tab
    // affordance for the inner control (the outer anchor still has it),
    // but avoid the nested-<a> hydration bug + double pushState.
    if (insideAnchor) {
      return (
        <Pressable
          style={[flatStyle, hovered && hoverStyle]}
          accessibilityRole={accessibilityRole ?? 'link'}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={accessibilityState}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onPress={(event) => handleWebClick(event?.nativeEvent ?? {})}
        >
          {children}
        </Pressable>
      );
    }

    return (
      <NestedAnchorContext.Provider value={true}>
        <a
          href={href}
          ref={(aRef) => {
            if (!aRef) return;
            aRef.onclick = handleWebClick as unknown as (e: MouseEvent) => void;
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
      </NestedAnchorContext.Provider>
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
