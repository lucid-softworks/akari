import { Redirect, Tabs, useNavigation } from 'expo-router';
import { Badge, Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { Sidebar } from '@/components/Sidebar';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const [isAccountSwitcherVisible, setAccountSwitcherVisible] = useState(false);
  const navigation = useNavigation();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const badgeBackgroundColor = useThemeColor({ light: '#FF3B30', dark: '#FF453A' }, 'tint');

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

  useEffect(() => {
    if (isLargeScreen) {
      return;
    }

    const removeTabPressListener = navigation.addListener('tabPress', (event) => {
      const state = navigation.getState();
      const currentRoute = state.routes.find((route) => route.key === event.target);
      const focusedRoute = state.routes[state.index];

      if (currentRoute && focusedRoute?.key === currentRoute.key) {
        tabScrollRegistry.handleTabPress(currentRoute.name);
      }
    });

    const removeTabLongPressListener = navigation.addListener('tabLongPress', (event) => {
      const state = navigation.getState();
      const currentRoute = state.routes.find((route) => route.key === event.target);

      if (currentRoute?.name === 'profile') {
        event.preventDefault?.();
        handleOpenAccountSwitcher();
      }
    });

    return () => {
      removeTabPressListener();
      removeTabLongPressListener();
    };
  }, [handleOpenAccountSwitcher, isLargeScreen, navigation]);

  const renderIcon = useCallback(
    (
      iosIcons: { default: string; selected: string },
      androidIcons: { default: string; selected: string },
    ) =>
      Platform.select({
        ios: (
          <Icon
            sf={{
              default: iosIcons.default,
              selected: iosIcons.selected,
            }}
          />
        ),
        default: (
          <Icon
            src={{
              default: (
                <VectorIcon family={MaterialCommunityIcons} name={androidIcons.default} />
              ),
              selected: (
                <VectorIcon family={MaterialCommunityIcons} name={androidIcons.selected} />
              ),
            }}
          />
        ),
      }),
    [],
  );

  const messagesBadge = useMemo(() => {
    if (!unreadMessagesCount) {
      return undefined;
    }
    return unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount);
  }, [unreadMessagesCount]);

  const notificationsBadge = useMemo(() => {
    if (!unreadNotificationsCount) {
      return undefined;
    }
    return unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount);
  }, [unreadNotificationsCount]);

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
                <Tabs.Screen name="index" />
                <Tabs.Screen name="search" />
                <Tabs.Screen name="messages" />
                <Tabs.Screen name="notifications" />
                <Tabs.Screen name="bookmarks" options={{ href: null }} />
                <Tabs.Screen name="post" options={{ href: null }} />
                <Tabs.Screen name="profile" />
                <Tabs.Screen name="settings" />
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
      <NativeTabs
        backgroundColor={tabBarSurface}
        badgeBackgroundColor={badgeBackgroundColor}
        disableTransparentOnScrollEdge
        iconColor={inactiveTint}
        labelStyle={{ color: inactiveTint, fontSize: 12, fontWeight: '600' }}
        shadowColor="rgba(12, 14, 24, 0.28)"
        tintColor={accentColor}
      >
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          {renderIcon(
            { default: 'house', selected: 'house.fill' },
            { default: 'home-outline', selected: 'home' },
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <Label>Search</Label>
          {renderIcon(
            { default: 'magnifyingglass', selected: 'magnifyingglass' },
            { default: 'magnify', selected: 'magnify' },
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="messages">
          <Label>Messages</Label>
          {renderIcon(
            { default: 'message', selected: 'message.fill' },
            { default: 'message-text-outline', selected: 'message-text' },
          )}
          <Badge hidden={!messagesBadge}>{messagesBadge}</Badge>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="notifications">
          <Label>Alerts</Label>
          {renderIcon(
            { default: 'bell', selected: 'bell.fill' },
            { default: 'bell-outline', selected: 'bell' },
          )}
          <Badge hidden={!notificationsBadge}>{notificationsBadge}</Badge>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="bookmarks" hidden options={{ href: null }} />
        <NativeTabs.Trigger name="post" hidden options={{ href: null }} />
        <NativeTabs.Trigger name="profile">
          <Label>Profile</Label>
          {renderIcon(
            { default: 'person', selected: 'person.fill' },
            { default: 'account-outline', selected: 'account' },
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Label>Settings</Label>
          {renderIcon(
            { default: 'gearshape', selected: 'gearshape.fill' },
            { default: 'cog-outline', selected: 'cog' },
          )}
        </NativeTabs.Trigger>
      </NativeTabs>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}
