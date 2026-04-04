import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';

type SettingsSubpageLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSubpageLayout({ children, title }: SettingsSubpageLayoutProps) {
  const { isLargeScreen } = useResponsive();
  const borderColor = useBorderColor();

  if (!isLargeScreen) {
    // On mobile, the parent tab layout already renders a header with
    // back navigation, so we skip SettingsHeader to avoid a double header.
    return (
      <ThemedView style={styles.mobileContainer}>
        {children}
      </ThemedView>
    );
  }

  // On large screens, just show header + content — the main app sidebar
  // already handles top-level navigation.
  return (
    <ThemedView style={styles.desktopContainer}>
      <ThemedView style={[styles.desktopHeader, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.desktopTitle}>{title}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.desktopBody}>{children}</ThemedView>
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
});
