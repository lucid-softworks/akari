import { usePathname, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TabBadge } from '@/components/TabBadge';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';

type NavKey = 'timeline' | 'search' | 'messages' | 'notifications' | 'profile' | 'settings';

type NavItem = {
  key: NavKey;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  route: string;
  badge?: number | null;
};

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const [isAccountSwitcherVisible, setAccountSwitcherVisible] = useState(false);

  const borderColor = useBorderColor();
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveBackground = useThemeColor({ light: '#F3F4F6', dark: '#111827' }, 'background');
  const activeBackground = useThemeColor({ light: '#FFFFFF', dark: '#1E2537' }, 'background');

  const shouldRenderNav = Platform.OS !== 'web' && !isLargeScreen;

  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount(shouldRenderNav);
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount(shouldRenderNav);

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: 'timeline', icon: 'house.fill', route: '/(tabs)' },
      { key: 'search', icon: 'magnifyingglass', route: '/(tabs)/search' },
      {
        key: 'messages',
        icon: 'message.fill',
        route: '/(tabs)/messages',
        badge: unreadMessagesCount,
      },
      {
        key: 'notifications',
        icon: 'bell.fill',
        route: '/(tabs)/notifications',
        badge: unreadNotificationsCount,
      },
      { key: 'profile', icon: 'person.fill', route: '/(tabs)/profile' },
      { key: 'settings', icon: 'gearshape.fill', route: '/(tabs)/settings' },
    ],
    [unreadMessagesCount, unreadNotificationsCount],
  );

  const activeKey = useMemo<NavKey>(() => {
    if (!pathname) {
      return 'timeline';
    }

    if (pathname.startsWith('/(tabs)/search') || pathname.startsWith('/search')) {
      return 'search';
    }

    if (pathname.startsWith('/(tabs)/messages') || pathname.startsWith('/messages')) {
      return 'messages';
    }

    if (pathname.startsWith('/(tabs)/notifications') || pathname.startsWith('/notifications')) {
      return 'notifications';
    }

    if (pathname.startsWith('/(tabs)/profile') || pathname.startsWith('/profile')) {
      return 'profile';
    }

    if (pathname.startsWith('/(tabs)/settings') || pathname.startsWith('/settings')) {
      return 'settings';
    }

    return 'timeline';
  }, [pathname]);

  const handleNavigate = useCallback(
    (item: NavItem) => {
      router.push(item.route as never);
    },
    [router],
  );

  const handleOpenAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(true);
  }, []);

  const handleCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(false);
  }, []);

  if (!shouldRenderNav) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            borderColor,
            backgroundColor: tabBarSurface,
            paddingBottom: bottom + 18,
          },
        ]}
      >
        {navItems.map((item) => {
          const isActive = item.key === activeKey;
          const iconColor = isActive ? accentColor : inactiveTint;
          const showBadge = (item.badge ?? 0) > 0;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.button,
                {
                  borderColor: isActive ? accentColor : borderColor,
                  backgroundColor: isActive ? activeBackground : inactiveBackground,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleNavigate(item)}
              onLongPress={item.key === 'profile' ? handleOpenAccountSwitcher : undefined}
            >
              <View style={[styles.indicator, { backgroundColor: isActive ? accentColor : 'transparent' }]} />
              <View style={styles.iconContainer}>
                <IconSymbol name={item.icon} color={iconColor} size={26} />
                {showBadge ? <TabBadge count={item.badge ?? 0} size="small" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    shadowColor: 'rgba(12, 14, 24, 0.28)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
