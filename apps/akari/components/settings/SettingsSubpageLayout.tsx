import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';

import { SettingsHeader } from './SettingsHeader';

type SettingsSubpageLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSubpageLayout({ children, title }: SettingsSubpageLayoutProps) {
  const { isLargeScreen } = useResponsive();
  const borderColor = useBorderColor();
  const { top, bottom } = useSafeAreaInsets();

  if (!isLargeScreen) {
    return (
      <ThemedView style={styles.mobileContainer}>
        <SettingsHeader title={title} />
        {children}
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.desktopContainer,
        { paddingTop: Math.max(top, 24), paddingBottom: Math.max(bottom, 24) },
      ]}
    >
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
