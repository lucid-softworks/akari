import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';

type SettingsSubpageLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSubpageLayout({ children, title }: SettingsSubpageLayoutProps) {
  const { isLargeScreen } = useResponsive();
  const borderColor = useBorderColor();
  // Column-edge borders match the rest of the web column (settings index,
  // home feed, moderation). They live on the outer container so the line
  // runs from the top of the title strip down through the body.
  const sideBorders = webColumnSideBorders(borderColor);
  // On web the whole page scrolls — mirror the home feed by using
  // `webScreenContainer` (min-height: 100vh; overflow: visible) on the
  // outer container so the body's intrinsic height drives the document
  // scroll instead of an inner overflow box. The inner content lives
  // inside `SettingsScroll`, which is a plain View on web — together
  // these collapse the historical "nested ScrollView in a flex column"
  // into a single page-level scroll.
  const isWeb = Platform.OS === 'web';

  if (!isLargeScreen) {
    return (
      <ThemedView
        style={[isWeb ? webScreenContainer : styles.mobileContainer, sideBorders]}
      >
        {children}
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[isWeb ? webScreenContainer : styles.desktopContainer, sideBorders]}
    >
      <ThemedView style={[styles.desktopHeader, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.desktopTitle}>{title}</ThemedText>
      </ThemedView>

      <ThemedView style={isWeb ? styles.desktopBodyWeb : styles.desktopBody}>{children}</ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  desktopContainer: {
    flex: 1,
  },
  desktopHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  desktopTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  desktopBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  // No flex: 1 on web so the body grows to fit its content rather than
  // collapsing to viewport height — that's what enables page-level
  // scroll when content overflows.
  desktopBodyWeb: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
