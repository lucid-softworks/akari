import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { TabBadge } from '@/components/TabBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const ROUTE_TO_REGISTRY_KEY: Record<string, string> = {
  index: 'index',
  search: 'search',
  messages: 'messages',
  'messages/[handle]': 'messages',
  'messages/pending': 'messages',
  notifications: 'notifications',
  profile: 'profile',
  'profile/[handle]': 'profile',
  settings: 'settings',
};

const TABS = [
  { name: 'index', icon: 'house.fill', accessibilityLabel: 'Home' },
  { name: 'search', icon: 'magnifyingglass', accessibilityLabel: 'Search' },
  { name: 'messages', icon: 'message.fill', accessibilityLabel: 'Messages' },
  { name: 'notifications', icon: 'bell.fill', accessibilityLabel: 'Notifications' },
  { name: 'profile', icon: 'person.fill', accessibilityLabel: 'Profile' },
  { name: 'settings', icon: 'gearshape.fill', accessibilityLabel: 'Settings' },
] as const;

type CustomTabBarProps = BottomTabBarProps & {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  onProfileLongPress: () => void;
};

export function CustomTabBar({
  state,
  navigation,
  unreadMessagesCount,
  unreadNotificationsCount,
  onProfileLongPress,
}: CustomTabBarProps) {
  const { routes, index } = state;
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const surface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const pressedBackground = useThemeColor({ light: '#E5E7EB', dark: '#1B2332' }, 'background');
  const lastPressedRegistryKeyRef = useRef<string | null>(null);

  const routeMap = useMemo(() => {
    const map = new Map<string, (typeof routes)[number]>();
    for (const route of routes) {
      map.set(route.name, route);
    }
    return map;
  }, [routes]);

  const getBadgeCount = useCallback(
    (name: (typeof TABS)[number]['name']) => {
      if (name === 'messages') {
        return unreadMessagesCount;
      }

      if (name === 'notifications') {
        return unreadNotificationsCount;
      }

      return 0;
    },
    [unreadMessagesCount, unreadNotificationsCount],
  );

  const handlePress = useCallback(
    (routeName: string) => {
      const route = routeMap.get(routeName);
      const isFocused = routes[index]?.name === routeName;
      const registryKey = ROUTE_TO_REGISTRY_KEY[routeName] ?? routeName;

      const event = route
        ? navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
        : undefined;

      if (!isFocused) {
        if (!event?.defaultPrevented) {
          navigation.navigate(routeName as never);
        }
        lastPressedRegistryKeyRef.current = registryKey;
        return;
      }

      if (lastPressedRegistryKeyRef.current === registryKey) {
        tabScrollRegistry.handleTabPress(registryKey);
      }

      lastPressedRegistryKeyRef.current = registryKey;
    },
    [navigation, routeMap, index, routes],
  );

  const handleLongPress = useCallback(
    (routeName: string) => {
      const route = routeMap.get(routeName);
      if (route) {
        navigation.emit({ type: 'tabLongPress', target: route.key });
      }

      if (routeName === 'profile') {
        onProfileLongPress();
      }
    },
    [navigation, onProfileLongPress, routeMap],
  );

  return (
    <View
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor: surface,
          paddingBottom: Math.max(insets.bottom, 12),
        },
        Platform.select({
          ios: styles.containerIOS,
          default: null,
        }),
      ]}
    >
      <View style={styles.tabList}>
        {TABS.map(({ name, icon, accessibilityLabel }) => {
          const isFocused = routes[index]?.name === name;
          const badgeCount = getBadgeCount(name);
          const tintColor = isFocused ? accentColor : inactiveTint;

          return (
            <HapticTab
              key={name}
              style={({ pressed }) => [styles.tabButton, pressed && { backgroundColor: pressedBackground }]}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{ selected: isFocused }}
              onPress={() => handlePress(name)}
              onLongPress={() => handleLongPress(name)}
            >
              <View style={styles.iconWrapper}>
                <IconSymbol name={icon} color={tintColor} size={28} style={{ marginBottom: -3 }} />
                {badgeCount > 0 ? <TabBadge count={badgeCount} size="small" /> : null}
              </View>
            </HapticTab>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    shadowColor: 'rgba(12, 14, 24, 0.28)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  containerIOS: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 6,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

