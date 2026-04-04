import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, radius, fontSize, fontWeight } from '@/constants/tokens';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useThemeColor } from '@/hooks/useThemeColor';

export const SIDEBAR_WIDTH = 260;

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  route: string;
  badge?: number | null;
};

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const insets = useSafeAreaInsets();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  // Theme colors
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const bgColor = useThemeColor({}, 'background');
  const activeBg = useThemeColor({ light: '#F3F4F6', dark: '#2A2D2E' }, 'background');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const badgeBg = useThemeColor({ light: '#FF3B30', dark: '#FF453A' }, 'tint');

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      { id: 'timeline', label: 'Home', icon: 'house.fill', route: '/(tabs)' },
      { id: 'search', label: 'Search', icon: 'magnifyingglass', route: '/(tabs)/search' },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bell.fill',
        route: '/(tabs)/notifications',
        badge: unreadNotificationsCount,
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: 'message.fill',
        route: '/(tabs)/messages',
        badge: unreadMessagesCount,
      },
      { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark.fill', route: '/(tabs)/bookmarks' },
      { id: 'profile', label: 'Profile', icon: 'person.fill', route: '/(tabs)/profile' },
    ],
    [unreadMessagesCount, unreadNotificationsCount],
  );

  const activeAccount = currentAccount ?? accounts[0];

  const isActiveRoute = (item: NavigationItem) => {
    if (item.route === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === item.route;
  };

  const handleNavigate = (item: NavigationItem) => {
    router.push(item.route as any);
    onNavigate?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Account header */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={() => router.push('/(tabs)/profile' as any)}
        style={({ pressed }) => [
          styles.accountSection,
          { borderBottomColor: borderColor },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: accentColor }]}>
          {activeAccount?.avatar ? (
            <Image source={{ uri: activeAccount.avatar }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarInitial}>
              {(activeAccount?.displayName || activeAccount?.handle || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.accountInfo}>
          <Text style={[styles.displayName, { color: textPrimary }]} numberOfLines={1}>
            {activeAccount?.displayName ?? activeAccount?.handle ?? 'Account'}
          </Text>
          {activeAccount?.handle ? (
            <Text style={[styles.handle, { color: textSecondary }]} numberOfLines={1}>
              @{activeAccount.handle}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* Navigation */}
      <View style={styles.nav}>
        {navigationItems.map((item) => {
          const active = isActiveRoute(item);
          return (
            <Pressable
              key={item.id}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => handleNavigate(item)}
              style={({ pressed }) => [
                styles.navItem,
                {
                  backgroundColor: active ? activeBg : pressed ? activeBg : 'transparent',
                },
              ]}
            >
              <IconSymbol
                name={item.icon}
                size={20}
                color={active ? accentColor : textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: active ? textPrimary : textSecondary,
                    fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                  },
                ]}
              >
                {item.label}
              </Text>
              {item.badge && item.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={styles.badgeText}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Settings at the bottom */}
      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        <Pressable
          accessibilityLabel="Settings"
          accessibilityRole="button"
          onPress={() => {
            router.push('/(tabs)/settings' as any);
            onNavigate?.();
          }}
          style={({ pressed }) => [
            styles.navItem,
            {
              backgroundColor: pathname.includes('/settings') ? activeBg : pressed ? activeBg : 'transparent',
            },
          ]}
        >
          <IconSymbol
            name="gearshape.fill"
            size={20}
            color={pathname.includes('/settings') ? accentColor : textSecondary}
          />
          <Text
            style={[
              styles.navLabel,
              {
                color: pathname.includes('/settings') ? textPrimary : textSecondary,
                fontWeight: pathname.includes('/settings') ? fontWeight.semibold : fontWeight.medium,
              },
            ]}
          >
            Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    height: '100%',
  },
  accountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  accountInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  nav: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  navLabel: {
    flex: 1,
    fontSize: fontSize.lg,
  },
  badge: {
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  footer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
