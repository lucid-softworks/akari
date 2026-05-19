import React from 'react';
import { Platform, ScrollView, type ScrollViewProps, View } from 'react-native';

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
export const SettingsScroll = React.forwardRef<
  ScrollView,
  ScrollViewProps & { children?: React.ReactNode }
>(function SettingsScroll(
  { children, contentContainerStyle, style, ...scrollProps },
  ref,
) {
  if (Platform.OS === 'web') {
    return <View style={[style, contentContainerStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={contentContainerStyle}
      style={style}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );
});
