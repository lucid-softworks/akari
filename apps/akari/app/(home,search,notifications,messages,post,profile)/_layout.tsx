import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { HapticTab } from '@/components/HapticTab';
import { Sidebar } from '@/components/Sidebar';
import { TabBadge } from '@/components/TabBadge';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

export const unstable_settings = {
  initialRouteName: 'index',
  home: { initialRouteName: 'index' },
  search: { initialRouteName: 'index' },
  notifications: { initialRouteName: 'index' },
  messages: { initialRouteName: 'index' },
  post: { initialRouteName: 'post' },
  profile: { initialRouteName: 'index' },
};

function TabBarIcon(props: { name: React.ComponentProps<typeof IconSymbol>['name']; color: string }) {
  return <IconSymbol size={28} style={{ marginBottom: -3 }} {...props} />;
}

type ProfileTabIconProps = {
  color: string;
  focused: boolean;
  avatarUri?: string;
};

function ProfileTabIcon({ color, focused, avatarUri }: ProfileTabIconProps) {
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'border');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const placeholderColor = useThemeColor({ light: '#D1D5DB', dark: '#1F2937' }, 'background');

  const resolvedBorderColor = focused ? accentColor : borderColor;
  const resolvedBackgroundColor = avatarUri ? 'transparent' : focused ? accentColor : placeholderColor;
  const resolvedIconColor = !avatarUri && focused ? '#FFFFFF' : color;

  return (
    <View
      style={[
        profileTabIconStyles.container,
        {
          borderColor: resolvedBorderColor,
          backgroundColor: resolvedBackgroundColor,
        },
      ]}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={profileTabIconStyles.image} contentFit="cover" />
      ) : (
        <IconSymbol name="person.fill" color={resolvedIconColor} size={18} />
      )}
    </View>
  );
}

type HardcodedTabKey = 'home' | 'search' | 'messages' | 'notifications' | 'profile' | 'settings';

const HARDCODED_TAB_KEYS: HardcodedTabKey[] = [
  'home',
  'search',
  'messages',
  'notifications',
  'profile',
  'settings',
];

type HardcodedTabBarProps = BottomTabBarProps & {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  avatarUri?: string;
};

const TAB_ROUTE_NAMES: Record<HardcodedTabKey, string[]> = {
  home: ['(home)', 'index'],
  search: ['(search)', 'search'],
  messages: ['(messages)', 'messages'],
  notifications: ['(notifications)', 'notifications'],
  profile: ['(profile)', 'profile'],
  settings: ['settings'],
};

const TAB_PATHS: Record<HardcodedTabKey, string> = {
  home: '/',
  search: '/search',
  messages: '/messages',
  notifications: '/notifications',
  profile: '/profile',
  settings: '/settings',
};

const resolveTabKeyForRoute = (routeName?: string): HardcodedTabKey | null => {
  if (!routeName) {
    return null;
  }

  for (const tabKey of HARDCODED_TAB_KEYS) {
    if (TAB_ROUTE_NAMES[tabKey].includes(routeName)) {
      return tabKey;
    }
  }

  return null;
};

function HardcodedTabBar({
  state,
  navigation,
  unreadMessagesCount,
  unreadNotificationsCount,
  avatarUri,
}: HardcodedTabBarProps) {
  const router = useRouter();
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const insets = useSafeAreaInsets();

  const TabBarBackgroundComponent = TabBarBackground as React.ComponentType | undefined;

  const [fallbackTabKey, setFallbackTabKey] = React.useState<HardcodedTabKey>(() => {
    const initialRoute = state.routes[state.index];
    return resolveTabKeyForRoute(initialRoute?.name) ?? 'home';
  });

  React.useEffect(() => {
    const focusedRoute = state.routes[state.index];
    const resolvedTabKey = resolveTabKeyForRoute(focusedRoute?.name);

    if (resolvedTabKey) {
      setFallbackTabKey(resolvedTabKey);
    }
  }, [state]);

  const currentRoute = state.routes[state.index];
  const currentRouteTabKey = resolveTabKeyForRoute(currentRoute?.name);
  const activeTabKey = currentRouteTabKey ?? fallbackTabKey;

  return (
    <View
      style={[
        hardcodedTabStyles.container,
        {
          borderColor,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : tabBarSurface,
          paddingBottom: 18 + insets.bottom,
        },
      ]}
    >
      {Platform.OS === 'ios' && TabBarBackgroundComponent ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <TabBarBackgroundComponent />
        </View>
      ) : null}
      <View style={hardcodedTabStyles.content}>
        {HARDCODED_TAB_KEYS.map((tabKey) => {
          const routeNameCandidates = TAB_ROUTE_NAMES[tabKey];
          const routeIndex = state.routes.findIndex((route) =>
            routeNameCandidates.includes(route.name),
          );
          if (routeIndex === -1) {
            return null;
          }

          const route = state.routes[routeIndex];
          const isCurrentRoute = state.index === routeIndex;
          const isVisuallyFocused = activeTabKey === tabKey;
          const color = isVisuallyFocused ? accentColor : inactiveTint;
          const badgeCount =
            tabKey === 'messages'
              ? unreadMessagesCount
              : tabKey === 'notifications'
              ? unreadNotificationsCount
              : 0;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (isCurrentRoute) {
              tabScrollRegistry.handleTabPress(tabKey);
            }

            if (!isCurrentRoute && !event.defaultPrevented) {
              navigation.navigate({
                name: route.name,
                params: route.params,
                merge: true,
              } as never);

              const targetPath = TAB_PATHS[tabKey];
              if (Platform.OS === 'web' && targetPath) {
                router.replace(targetPath);
              }
            }
          };

          const handleLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <HapticTab
              key={tabKey}
              accessibilityRole="button"
              accessibilityState={{ selected: isVisuallyFocused }}
              onPress={handlePress}
              onLongPress={handleLongPress}
              style={hardcodedTabStyles.tabButton}
            >
              <View style={hardcodedTabStyles.iconContainer}>
                {tabKey === 'messages' || tabKey === 'notifications' ? (
                  <View style={hardcodedTabStyles.badgeWrapper}>
                    <TabBarIcon
                      name={tabKey === 'messages' ? 'message.fill' : 'bell.fill'}
                      color={color}
                    />
                    <TabBadge count={badgeCount} size="small" />
                  </View>
                ) : tabKey === 'profile' ? (
                  <ProfileTabIcon color={color} focused={isVisuallyFocused} avatarUri={avatarUri} />
                ) : (
                  <TabBarIcon
                    name={
                      tabKey === 'home'
                        ? 'house.fill'
                        : tabKey === 'search'
                        ? 'magnifyingglass'
                        : 'gearshape.fill'
                    }
                    color={color}
                  />
                )}
              </View>
            </HapticTab>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: currentAccount } = useCurrentAccount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const [isAccountSwitcherVisible, setAccountSwitcherVisible] = useState(false);
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const handleOpenAccountSwitcher = useCallback(() => {
    if (isLargeScreen) {
      return;
    }

    setAccountSwitcherVisible(true);
  }, [isLargeScreen]);

  const handleCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(false);
  }, []);

  usePushNotifications();

  if (isLoading) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={accentColor} />
      </ThemedView>
    );
  }

  if (!authStatus?.isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  const sharedScreens = (
    <>
      <Tabs.Screen name="(home)" options={{ href: '/' }} />
      <Tabs.Screen name="(search)" options={{ href: '/search' }} />
      <Tabs.Screen name="(messages)" options={{ href: '/messages' }} />
      <Tabs.Screen name="(notifications)" options={{ href: '/notifications' }} />
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen
        name="(profile)"
        options={{ href: '/profile' }}
        listeners={() => ({
          tabLongPress: (event) => {
            event.preventDefault?.();
            handleOpenAccountSwitcher();
          },
        })}
      />
      <Tabs.Screen name="settings" />
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: 16,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              width: '100%',
              maxWidth: 1200,
              minHeight: '100%',
            }}
          >
            <Sidebar />
            <View
              style={{
                flex: 1,
                minHeight: '100%',
              }}
            >
              <Tabs
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: { display: 'none' },
                }}
              >
                {sharedScreens}
              </Tabs>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => (
          <HardcodedTabBar
            {...props}
            unreadMessagesCount={unreadMessagesCount}
            unreadNotificationsCount={unreadNotificationsCount}
            avatarUri={currentAccount?.avatar}
          />
        )}
      >
        {sharedScreens}
      </Tabs>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}

const profileTabIconStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: -3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

const hardcodedTabStyles = StyleSheet.create({
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
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
