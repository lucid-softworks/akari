import { useNavigationState } from '@react-navigation/native';
import { Redirect, Tabs } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { HapticTab } from '@/components/HapticTab';
import { Sidebar } from '@/components/Sidebar';
import { TabBadge } from '@/components/TabBadge';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
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

const VISIBLE_TABS = [
  { name: 'index', icon: 'house.fill' },
  { name: 'search', icon: 'magnifyingglass' },
  { name: 'messages', icon: 'message.fill' },
  { name: 'notifications', icon: 'bell.fill' },
  { name: 'profile', icon: 'person.fill' },
  { name: 'settings', icon: 'gearshape.fill' },
] as const;

const HIDDEN_ROUTES = [
  'bookmarks',
  'messages/[handle]',
  'messages/pending',
  'post/[id]',
  'profile/[handle]',
] as const;

const HIDDEN_TAB_OPTIONS = { href: null, tabBarButton: () => null } as const;

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: { name: React.ComponentProps<typeof IconSymbol>['name']; color: string }) {
  return <IconSymbol size={28} style={{ marginBottom: -3 }} {...props} />;
}

/**
 * Custom tab button that tracks which tab is being pressed
 */
function CustomTabButton(props: any) {
  const navigationState = useNavigationState((state) => state);
  const lastPressedTabRef = useRef<string | null>(null);

  const handleTabPress = () => {
    // Use a timeout to check the navigation state after the tab press
    // since the navigation state doesn't update immediately
    setTimeout(() => {
      const currentRoute = navigationState?.routes?.[navigationState.index]?.name;

      if (currentRoute) {
        // Check if this is the same tab pressed again
        const registryKey = ROUTE_TO_REGISTRY_KEY[currentRoute] ?? currentRoute;

        if (lastPressedTabRef.current === registryKey) {
          tabScrollRegistry.handleTabPress(registryKey);
        }

        lastPressedTabRef.current = registryKey;
      }
    }, 50); // Small delay to ensure navigation state has updated
  };

  return <HapticTab {...props} onTabPress={handleTabPress} />;
}

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const [isAccountSwitcherVisible, setAccountSwitcherVisible] = useState(false);
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const tabBarStyle = {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 18,
    height: 86,
    shadowColor: 'rgba(12, 14, 24, 0.28)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    ...Platform.select({
      ios: {
        position: 'absolute',
        backgroundColor: 'transparent',
      },
      default: {
        backgroundColor: tabBarSurface,
      },
    }),
  } as const;

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
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: { display: 'none' },
                }}
              >
                {VISIBLE_TABS.map(({ name }) => (
                  <Tabs.Screen key={name} name={name} />
                ))}
                {HIDDEN_ROUTES.map((name) => (
                  <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
                ))}
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
        screenOptions={{
          tabBarActiveTintColor: accentColor,
          tabBarInactiveTintColor: inactiveTint,
          headerShown: false,
          tabBarButton: CustomTabButton,
          tabBarBackground: TabBarBackground,
          tabBarShowLabel: false,
          tabBarStyle,
          tabBarItemStyle: {
            marginHorizontal: 4,
            paddingVertical: 0,
          },
        }}
      >
        {VISIBLE_TABS.map(({ name, icon }) => {
          const options = {
            tabBarIcon: ({ color }: { color: string }) => {
              const baseIcon = <TabBarIcon name={icon} color={color} />;

              if (name === 'messages') {
                return (
                  <View style={{ position: 'relative' }}>
                    {baseIcon}
                    <TabBadge count={unreadMessagesCount} size="small" />
                  </View>
                );
              }

              if (name === 'notifications') {
                return (
                  <View style={{ position: 'relative' }}>
                    {baseIcon}
                    <TabBadge count={unreadNotificationsCount} size="small" />
                  </View>
                );
              }

              return baseIcon;
            },
          };

          if (name === 'profile') {
            return (
              <Tabs.Screen
                key={name}
                name={name}
                options={options}
                listeners={() => ({
                  tabLongPress: (event) => {
                    event.preventDefault();
                    handleOpenAccountSwitcher();
                  },
                })}
              />
            );
          }

          return <Tabs.Screen key={name} name={name} options={options} />;
        })}
        {HIDDEN_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
        ))}
      </Tabs>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}
