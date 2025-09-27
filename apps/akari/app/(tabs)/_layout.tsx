import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import React, { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TabBadge } from '@/components/TabBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Sidebar } from '@/components/Sidebar';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const VISIBLE_TABS = [
  { name: 'index', title: 'Home', icon: 'house.fill', accessibilityLabel: 'Home' },
  {
    name: 'notifications',
    title: 'Notifications',
    icon: 'bell.fill',
    accessibilityLabel: 'Notifications',
  },
  { name: 'messages', title: 'Messages', icon: 'message.fill', accessibilityLabel: 'Messages' },
  { name: 'settings', title: 'Settings', icon: 'gearshape.fill', accessibilityLabel: 'Settings' },
] as const;

const ROUTE_TO_REGISTRY_KEY: Record<string, string> = {
  index: 'index',
  notifications: 'notifications',
  messages: 'messages',
  'messages/[handle]': 'messages',
  'messages/pending': 'messages',
  settings: 'settings',
  'post/[id]': 'index',
};

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const lastPressedRegistryKeyRef = useRef<string | null>(null);
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarStyle = useMemo(
    () => ({
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor,
      backgroundColor: tabBarSurface,
    }),
    [borderColor, tabBarSurface],
  );

  const handleTabPress = useCallback(
    (routeName: (typeof VISIBLE_TABS)[number]['name'], navigation: BottomTabNavigationProp<any>) => {
      const registryKey = ROUTE_TO_REGISTRY_KEY[routeName] ?? routeName;
      const state = navigation.getState();
      const focusedRouteName = state.routeNames?.[state.index];

      if (focusedRouteName === routeName) {
        if (lastPressedRegistryKeyRef.current === registryKey) {
          tabScrollRegistry.handleTabPress(registryKey);
        }

        lastPressedRegistryKeyRef.current = registryKey;
        return;
      }

      lastPressedRegistryKeyRef.current = registryKey;
    },
    [lastPressedRegistryKeyRef],
  );

  const renderTabIcon = useCallback(
    (icon: React.ComponentProps<typeof IconSymbol>['name'], color: string, badgeCount: number) => (
      <View style={styles.iconWrapper}>
        <IconSymbol name={icon} color={color} size={28} style={styles.icon} />
        {badgeCount > 0 ? <TabBadge count={badgeCount} size="small" /> : null}
      </View>
    ),
    [],
  );

  const getBadgeCount = useCallback(
    (name: (typeof VISIBLE_TABS)[number]['name']) => {
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
                  <Tabs.Screen
                    key={name}
                    name={name}
                    listeners={({ navigation }) => ({
                      tabPress: () => handleTabPress(name, navigation),
                    })}
                  />
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
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarShowLabel: false,
          tabBarActiveTintColor: accentColor,
          tabBarInactiveTintColor: inactiveTint,
        }}
      >
        {VISIBLE_TABS.map(({ name, icon, accessibilityLabel }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: accessibilityLabel,
              tabBarAccessibilityLabel: accessibilityLabel,
              tabBarIcon: ({ color = accentColor }) => renderTabIcon(icon, color, getBadgeCount(name)),
            }}
            listeners={({ navigation }) => ({
              tabPress: () => handleTabPress(name, navigation),
            })}
          />
        ))}
      </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: -3,
  },
});
