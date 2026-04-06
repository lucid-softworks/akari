import { router } from 'expo-router';
import React, { useCallback, useRef } from 'react';
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

export function PressableLink({
  href,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: PressableLinkProps) {
  const handleNativePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    return (
      <WebPressableLink
        href={href}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {children}
      </WebPressableLink>
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

// Web-only component using refs to attach native DOM click handler
function WebPressableLink({
  href,
  style,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: Omit<PressableLinkProps, 'onPress'>) {
  const ref = useRef<any>(null);

  const handleRef = useCallback((node: any) => {
    ref.current = node;
    if (!node) return;

    // Get the actual DOM element from the React Native Web component
    const el = node._nativeTag ?? node;
    if (!el || !el.addEventListener) return;

    // Find or create the wrapping <a> tag
    const parent = el.parentElement;
    if (parent?.tagName === 'A') {
      // Already wrapped, attach click handler
      parent.addEventListener('click', (e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        router.push(href as any);
      });
    }
  }, [href]);

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
        ref={handleRef}
        style={style}
        accessibilityRole={accessibilityRole ?? 'link'}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    </a>
  );
}
