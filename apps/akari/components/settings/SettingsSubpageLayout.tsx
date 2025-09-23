import { router, usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettingsNavigationItems } from '@/hooks/useSettingsNavigationItems';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import { SettingsHeader } from './SettingsHeader';

type SettingsSubpageLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSubpageLayout({ children, title }: SettingsSubpageLayoutProps) {
  const { isLargeScreen } = useResponsive();
  const navigationItems = useSettingsNavigationItems();
  const borderColor = useBorderColor();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();

  const activeItemBackground = useThemeColor(
    { light: 'rgba(124, 140, 249, 0.12)', dark: 'rgba(124, 140, 249, 0.24)' },
    'background',
  );
  const inactiveItemColor = useThemeColor(
    { light: 'rgba(17, 24, 39, 0.6)', dark: 'rgba(255, 255, 255, 0.65)' },
    'text',
  );
  const activeItemColor = useThemeColor({}, 'text');

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
      <ThemedView style={[styles.sidebar, { borderRightColor: borderColor }]}>
        <ThemedText style={styles.sidebarTitle}>{t('navigation.settings')}</ThemedText>
        <ThemedView style={styles.sidebarList}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.route;
            const itemColor = isActive ? activeItemColor : inactiveItemColor;

            return (
              <TouchableOpacity
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                activeOpacity={0.7}
                onPress={() => router.replace(item.route as never)}
                style={[
                  styles.sidebarItem,
                  isActive ? { backgroundColor: activeItemBackground } : null,
                ]}
              >
                <IconSymbol
                  color={itemColor}
                  name={item.icon}
                  size={20}
                  style={styles.sidebarItemIcon}
                />
                <ThemedText style={[styles.sidebarItemLabel, { color: itemColor }]}>
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.desktopContent}>
        <ThemedView style={[styles.desktopHeader, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.desktopTitle}>{title}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.desktopBody}>{children}</ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    opacity: 0.65,
    paddingHorizontal: 24,
    textTransform: 'uppercase',
  },
  sidebarList: {
    marginTop: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sidebarItemIcon: {
    marginRight: 12,
  },
  sidebarItemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  desktopContent: {
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
