import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
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
import { TAB_PATHS, useTabNavigation } from '@/hooks/useTabNavigation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
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

type HardcodedTabKey = 'index' | 'search' | 'messages' | 'notifications' | 'profile' | 'settings';
type HardcodedRouteName = `(${HardcodedTabKey})`;

function resolveRouteName(tabKey: HardcodedTabKey): HardcodedRouteName {
  return `(${tabKey})`;
}

type HardcodedTabBarProps = BottomTabBarProps & {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  avatarUri?: string;
};

function HardcodedTabBar({
  state,
  navigation,
  unreadMessagesCount,
  unreadNotificationsCount,
  avatarUri,
}: HardcodedTabBarProps) {
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const insets = useSafeAreaInsets();
  const { activeTab, isSharedRouteFocused, navigateToTabRoot } = useTabNavigation();
  const focusedRoute = state.routes[state.index];
  const focusedNestedState =
    focusedRoute?.state && typeof focusedRoute.state === 'object'
      ? (focusedRoute.state as { index?: number })
      : undefined;
  const isNestedRouteFocused = typeof focusedNestedState?.index === 'number' && focusedNestedState.index > 0;

  const TabBarBackgroundComponent = TabBarBackground as React.ComponentType | undefined;

  const hardcodedTabs: HardcodedTabKey[] = ['index', 'search', 'messages', 'notifications', 'profile', 'settings'];

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
        {hardcodedTabs.map((tabKey) => {
          const routeName = resolveRouteName(tabKey);
          const routeIndex = state.routes.findIndex((route) => route.name === routeName);
          if (routeIndex === -1) {
            return null;
          }

          const route = state.routes[routeIndex];
          const isFocused = tabKey === activeTab;
          const color = isFocused ? accentColor : inactiveTint;
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

            if (isFocused && (isNestedRouteFocused || isSharedRouteFocused)) {
              if (!event.defaultPrevented) {
                navigateToTabRoot(tabKey);
                tabScrollRegistry.handleTabPress(tabKey);
              }

              return;
            }

            if (isFocused) {
              tabScrollRegistry.handleTabPress(tabKey);
              return;
            }

            if (!event.defaultPrevented) {
              navigateToTabRoot(tabKey);
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
              accessibilityState={{ selected: isFocused }}
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
                  <ProfileTabIcon color={color} focused={isFocused} avatarUri={avatarUri} />
                ) : (
                  <TabBarIcon
                    name={
                      tabKey === 'index'
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

  // Initialize push notifications
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

  // Don't render tabs if not authenticated or still loading
  if (!authStatus?.isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  // For large screens, show tabs without the tab bar
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
        initialRouteName="(index)"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
              >
                <Tabs.Screen name="(index)" options={{ href: TAB_PATHS.index }} />
                <Tabs.Screen name="(search)" options={{ href: TAB_PATHS.search }} />
                <Tabs.Screen name="(messages)" options={{ href: TAB_PATHS.messages }} />
                <Tabs.Screen
                  name="(notifications)"
                  options={{ href: TAB_PATHS.notifications }}
                />
                <Tabs.Screen name="(bookmarks)" options={{ href: TAB_PATHS.bookmarks }} />
                <Tabs.Screen name="(profile)" options={{ href: TAB_PATHS.profile }} />
                <Tabs.Screen name="(settings)" options={{ href: TAB_PATHS.settings }} />
              </Tabs>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  // For mobile screens, show the traditional tab bar
  return (
    <>
      <Tabs
        initialRouteName="(index)"
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
        <Tabs.Screen
          name="(index)"
          options={{
            href: TAB_PATHS.index,
            tabBarIcon: ({ color }) => <TabBarIcon name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="(search)"
          options={{
            href: TAB_PATHS.search,
            tabBarIcon: ({ color }) => <TabBarIcon name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="(messages)"
          options={{
            href: TAB_PATHS.messages,
            tabBarIcon: ({ color }) => (
              <View style={{ position: 'relative' }}>
                <TabBarIcon name="message.fill" color={color} />
                <TabBadge count={unreadMessagesCount} size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="(notifications)"
          options={{
            href: TAB_PATHS.notifications,
            tabBarIcon: ({ color }) => (
              <View style={{ position: 'relative' }}>
                <TabBarIcon name="bell.fill" color={color} />
                <TabBadge count={unreadNotificationsCount} size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen name="(bookmarks)" options={{ href: TAB_PATHS.bookmarks }} />
        <Tabs.Screen
          name="(profile)"
          options={{
            href: TAB_PATHS.profile,
            tabBarIcon: ({ color, focused }) => (
              <ProfileTabIcon color={color} focused={focused} avatarUri={currentAccount?.avatar} />
            ),
          }}
          listeners={() => ({
            tabLongPress: (event) => {
              event.preventDefault();
              handleOpenAccountSwitcher();
            },
          })}
        />
        <Tabs.Screen
          name="(settings)"
          options={{
            href: TAB_PATHS.settings,
            tabBarIcon: ({ color }) => <TabBarIcon name="gearshape.fill" color={color} />,
          }}
        />
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
    alignSelf: 'stretch',
    width: '100%',
  },
  tabButton: {
    marginHorizontal: 4,
    marginVertical: 0,
    paddingVertical: 0,
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
