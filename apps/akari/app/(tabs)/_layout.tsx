import { useNavigation } from '@react-navigation/native';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs, Icon, Label, Badge } from 'expo-router/unstable-native-tabs';
import React, { useCallback, useEffect, useState } from 'react';
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
  const badgeBackgroundColor = useThemeColor({ light: '#ff3b30', dark: '#ff453a' }, 'tint');

  const handleOpenAccountSwitcher = useCallback(() => {
    if (isLargeScreen) {
      return;
    }

    setAccountSwitcherVisible(true);
  }, [isLargeScreen]);

  const handleCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(false);
  }, []);

  useEffect(() => {
    if (!navigation || isLargeScreen) {
      return undefined;
    }

    const unsubscribeTabPress = navigation.addListener('tabPress', (event: any) => {
      const state = navigation.getState();
      const pressedRoute = state.routes.find((route) => route.key === event.target);
      const activeRoute = state.routes[state.index ?? 0];

      if (pressedRoute && activeRoute && pressedRoute.key === activeRoute.key) {
        tabScrollRegistry.handleTabPress(pressedRoute.name);
      }
    });

    const unsubscribeLongPress = navigation.addListener('tabLongPress', (event: any) => {
      const state = navigation.getState();
      const pressedRoute = state.routes.find((route) => route.key === event.target);

      if (pressedRoute?.name === 'profile') {
        event.preventDefault?.();
        handleOpenAccountSwitcher();
      }
    });

    return () => {
      unsubscribeTabPress();
      unsubscribeLongPress();
    };
  }, [handleOpenAccountSwitcher, isLargeScreen, navigation]);

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
        badgeTextColor="#ffffff"
        disableTransparentOnScrollEdge
        iconColor={inactiveTint}
        indicatorColor={accentColor}
        labelStyle={{
          color: inactiveTint,
          fontSize: 11,
          fontWeight: '600',
        }}
        shadowColor={Platform.select({ ios: 'rgba(12, 14, 24, 0.28)', default: undefined })}
        tintColor={accentColor}
      >
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} selectedColor={accentColor} />
          <Label selectedStyle={{ color: accentColor }}>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <Icon sf="magnifyingglass" selectedColor={accentColor} />
          <Label selectedStyle={{ color: accentColor }}>Search</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="messages">
          <Icon sf={{ default: 'message', selected: 'message.fill' }} selectedColor={accentColor} />
          <Badge hidden={unreadMessagesCount === 0}>
            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount.toString()}
          </Badge>
          <Label selectedStyle={{ color: accentColor }}>Messages</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="notifications">
          <Icon sf={{ default: 'bell', selected: 'bell.fill' }} selectedColor={accentColor} />
          <Badge hidden={unreadNotificationsCount === 0}>
            {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount.toString()}
          </Badge>
          <Label selectedStyle={{ color: accentColor }}>Notifications</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="bookmarks" hidden options={{ href: null }} />
        <NativeTabs.Trigger name="post" hidden options={{ href: null }} />
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: 'person', selected: 'person.fill' }} selectedColor={accentColor} />
          <Label selectedStyle={{ color: accentColor }}>Profile</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} selectedColor={accentColor} />
          <Label selectedStyle={{ color: accentColor }}>Settings</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}
