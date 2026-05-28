import React from 'react';
import { Platform, ScrollView, StyleSheet, type ScrollViewProps, View } from 'react-native';

/**
 * Drop-in replacement for `<ScrollView>` inside settings sub-pages.
 * On native it behaves exactly like a ScrollView (own scroll container,
 * pull-to-refresh, etc.). On web it renders as a plain `<View>` so the
 * page itself scrolls — mirroring the home feed's page-level scroll
 * pattern. The settings pages then live inside the
 * `SettingsSubpageLayout`'s `webScreenContainer` which gives the
 * document body its `min-height: 100vh; overflow: visible` behaviour.
 *
 * Props that ScrollView accepts but View doesn't (e.g.
 * `showsVerticalScrollIndicator`, `keyboardShouldPersistTaps`) are
 * silently dropped on web — they have no meaning when the page is
 * scrolling the document, not a nested container. `contentContainerStyle`
 * is merged onto the View's style on web so layout/padding survives.
 */
type SettingsScrollProps = ScrollViewProps & {
  children?: React.ReactNode;
  ref?: React.Ref<ScrollView>;
};

export function SettingsScroll({
  children,
  contentContainerStyle,
  style,
  ref,
  ...scrollProps
}: SettingsScrollProps) {
  // Default a vertical gap between top-level children so screens can
  // stack <SettingsSection> entries without any inline `marginTop`. A
  // top padding replaces what was historically the first section's
  // `marginTop: 24`. Consumers can still override either via
  // `contentContainerStyle`.
  const container = [styles.container, contentContainerStyle];
  if (Platform.OS === 'web') {
    return <View style={[style, container]}>{children}</View>;
  }
  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={container}
      style={style}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 32,
  },
});
