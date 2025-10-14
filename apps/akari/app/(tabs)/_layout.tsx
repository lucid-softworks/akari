import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Redirect, Tabs } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';

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
        <View style={hardcodedTabStyles.tabList}>
          {hardcodedTabs.map((tabKey) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tabKey);
          if (routeIndex === -1) {
            return null;
          }

          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          const color = isFocused ? accentColor : inactiveTint;
          const badgeCount =
            tabKey === 'messages' ? unreadMessagesCount : tabKey === 'notifications' ? unreadNotificationsCount : 0;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (isFocused) {
              tabScrollRegistry.handleTabPress(tabKey);
            }

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
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
                    <TabBarIcon name={tabKey === 'messages' ? 'message.fill' : 'bell.fill'} color={color} />
                    <TabBadge count={badgeCount} size="small" />
                  </View>
                ) : tabKey === 'profile' ? (
                  <ProfileTabIcon color={color} focused={isFocused} avatarUri={avatarUri} />
                ) : (
                  <TabBarIcon
                    name={tabKey === 'index' ? 'house.fill' : tabKey === 'search' ? 'magnifyingglass' : 'gearshape.fill'}
                    color={color}
                  />
                )}
              </View>
            </HapticTab>
          );
          })}
        </View>
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
  const drawerRef = useRef<React.ComponentRef<typeof DrawerLayout>>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const drawerOverlayColor = useThemeColor({ light: 'rgba(15, 17, 21, 0.36)', dark: 'rgba(7, 10, 18, 0.6)' }, 'background');
  const headerBackground = useThemeColor({ light: '#FFFFFF', dark: '#0B0F19' }, 'background');
  const headerIconColor = useThemeColor({ light: '#111827', dark: '#F9FAFB' }, 'text');
  const headerBorderColor = useBorderColor();

  const handleOpenAccountSwitcher = useCallback(() => {
    if (isLargeScreen) {
      return;
    }

    setAccountSwitcherVisible(true);
  }, [isLargeScreen]);

  const handleCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(false);
  }, []);

  const handleOpenDrawer = useCallback(() => {
    drawerRef.current?.openDrawer();
  }, []);

  const handleCloseDrawer = useCallback(() => {
    drawerRef.current?.closeDrawer();
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
                backBehavior={Platform.OS === 'web' ? 'history' : undefined}
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
      <DrawerLayout
        ref={drawerRef}
        drawerWidth={304}
        drawerPosition="left"
        drawerType="front"
        edgeWidth={32}
        overlayColor={drawerOverlayColor}
        drawerBackgroundColor="transparent"
        style={mobileDrawerStyles.drawerContainer}
        renderNavigationView={(_progress) => (
          <View
            style={[
              mobileDrawerStyles.drawerContent,
              {
                paddingTop: safeAreaInsets.top + 12,
                paddingBottom: safeAreaInsets.bottom + 16,
              },
            ]}
          >
            <Sidebar onNavigate={handleCloseDrawer} />
          </View>
        )}
      >
        {(drawerProgress) => {
          const translateX =
            drawerProgress?.interpolate({ inputRange: [0, 1], outputRange: [0, 304] }) ?? 0;

          return (
            <Animated.View
              style={[
                mobileDrawerStyles.contentContainer,
                drawerProgress
                  ? {
                      transform: [{ translateX }],
                    }
                  : null,
              ]}
            >
              <View
                style={[
                  mobileDrawerStyles.header,
                  {
                    paddingTop: safeAreaInsets.top + 10,
                    backgroundColor: headerBackground,
                    borderBottomColor: headerBorderColor,
                  },
                ]}
              >
                <HapticTab
                  accessibilityRole="button"
                  accessibilityLabel="Open navigation drawer"
                  onPress={handleOpenDrawer}
                  style={mobileDrawerStyles.headerButton}
                >
                  <IconSymbol name="line.3.horizontal" color={headerIconColor} size={22} />
                </HapticTab>
              </View>
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
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color }) => <TabBarIcon name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color }) => <TabBarIcon name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            tabBarIcon: ({ color }) => (
              <View style={{ position: 'relative' }}>
                <TabBarIcon name="message.fill" color={color} />
                <TabBadge count={unreadMessagesCount} size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ color }) => (
              <View style={{ position: 'relative' }}>
                <TabBarIcon name="bell.fill" color={color} />
                <TabBadge count={unreadNotificationsCount} size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="bookmarks"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
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
          name="settings"
          options={{
            tabBarIcon: ({ color }) => <TabBarIcon name="gearshape.fill" color={color} />,
          }}
        />
              </Tabs>
            </Animated.View>
          );
        }}
      </DrawerLayout>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    width: '100%',
  },
  tabButton: {
    marginHorizontal: 4,
    marginVertical: 0,
    paddingVertical: 0,
  },
  tabList: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
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

const mobileDrawerStyles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
