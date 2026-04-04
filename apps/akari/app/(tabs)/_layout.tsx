import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, radius, fontSize, fontWeight, shadows, layout, touchTarget } from '@/constants/tokens';
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

const mobileHeaderLogo = require('@/assets/images/icon.png');

const headerTitles: Record<string, string> = {
  index: 'Home',
  search: 'Search',
  messages: 'Messages',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  bookmarks: 'Bookmarks',
  post: 'Post',
  // Settings sub-pages
  account: 'Account',
  'privacy-and-security': 'Privacy & Security',
  moderation: 'Moderation',
  'content-and-media': 'Content & Media',
  appearance: 'Appearance',
  accessibility: 'Accessibility',
  languages: 'Languages',
  about: 'About',
  development: 'Development',
};

const zeroTopSceneContainerStyle = { paddingTop: 0 } as const;

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

type HardcodedTabKey = 'index' | 'search' | 'messages' | 'notifications' | 'bookmarks' | 'profile';

type HardcodedTabBarProps = BottomTabBarProps & {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  avatarUri?: string;
};

const TabButton = React.memo(function TabButton({
  tabKey,
  route,
  isFocused,
  color,
  badgeCount,
  avatarUri,
  navigation,
}: {
  tabKey: HardcodedTabKey;
  route: { key: string; name: string };
  isFocused: boolean;
  color: string;
  badgeCount: number;
  avatarUri?: string;
  navigation: HardcodedTabBarProps['navigation'];
}) {
  const handlePress = useCallback(() => {
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
  }, [navigation, route.key, route.name, isFocused, tabKey]);

  const handleLongPress = useCallback(() => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  }, [navigation, route.key]);

  return (
    <HapticTab
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
            name={
              tabKey === 'index' ? 'house.fill'
                : tabKey === 'search' ? 'magnifyingglass'
                : tabKey === 'bookmarks' ? 'bookmark.fill'
                : 'gearshape.fill'
            }
            color={color}
          />
        )}
      </View>
    </HapticTab>
  );
});

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
  const tabBarSurface = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const TabBarBackgroundComponent = TabBarBackground as React.ComponentType | undefined;

  const hardcodedTabs: HardcodedTabKey[] = ['index', 'search', 'messages', 'notifications', 'bookmarks', 'profile'];
  return (
    <View
      style={[
        hardcodedTabStyles.container,
        {
          borderColor,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : tabBarSurface,
          paddingLeft: Math.max(20, insets.left + 12),
          paddingRight: Math.max(20, insets.right + 12),
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

            return (
              <TabButton
                key={tabKey}
                tabKey={tabKey}
                route={route}
                isFocused={isFocused}
                color={color}
                badgeCount={badgeCount}
                avatarUri={avatarUri}
                navigation={navigation}
              />
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
  const safeAreaInsets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const headerBackground = useThemeColor({}, 'background');
  const headerIconColor = useThemeColor({ light: '#111827', dark: '#F9FAFB' }, 'text');
  const headerBorderColor = useBorderColor();
  const headerTextColor = headerIconColor;

  const { currentTabKey, isNestedRoute, nestedRouteKey } = useMemo(() => {
    if (!pathname) {
      return { currentTabKey: 'index', isNestedRoute: false, nestedRouteKey: undefined };
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return { currentTabKey: 'index', isNestedRoute: false, nestedRouteKey: undefined };
    }

    const nonGroupSegments = segments.filter((segment) => !segment.startsWith('('));
    const firstNonGroupSegment = nonGroupSegments[0] ?? 'index';
    const nested = nonGroupSegments.length > 1;
    return {
      currentTabKey: firstNonGroupSegment,
      isNestedRoute: nested,
      nestedRouteKey: nested ? nonGroupSegments[nonGroupSegments.length - 1] : undefined,
    };
  }, [pathname]);

  const headerTitle = isNestedRoute
    ? (headerTitles[nestedRouteKey ?? ''] ?? headerTitles[currentTabKey] ?? 'Akari')
    : (headerTitles[currentTabKey] ?? 'Akari');
  const shouldShowMobileHeader = currentTabKey !== 'profile';

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

  const contentSafeAreaInsets = useMemo(
    () => ({
      top: shouldShowMobileHeader ? 0 : safeAreaInsets.top,
      right: safeAreaInsets.right,
      bottom: safeAreaInsets.bottom,
      left: safeAreaInsets.left,
    }),
    [safeAreaInsets.bottom, safeAreaInsets.left, safeAreaInsets.right, safeAreaInsets.top, shouldShowMobileHeader],
  );

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
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.xxl,
              width: '100%',
              maxWidth: layout.maxContentWidth,
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
                  sceneContainerStyle: zeroTopSceneContainerStyle,
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

  // For mobile screens, show the traditional tab bar (no drawer)
  return (
    <>
      <SafeAreaInsetsContext.Provider value={contentSafeAreaInsets}>
        <View
          style={[
            mobileDrawerStyles.contentContainer,
            shouldShowMobileHeader
              ? null
              : { paddingTop: safeAreaInsets.top },
          ]}
        >
          {shouldShowMobileHeader ? (
            <View
              style={[
                mobileDrawerStyles.header,
                {
                  paddingTop: safeAreaInsets.top + 6,
                  backgroundColor: headerBackground,
                  borderBottomColor: headerBorderColor,
                },
              ]}
            >
              {isNestedRoute ? (
                <HapticTab
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={() => router.back()}
                  style={mobileDrawerStyles.headerButton}
                >
                  <IconSymbol name="chevron.left" color={headerIconColor} size={22} />
                </HapticTab>
              ) : (
                <View style={mobileDrawerStyles.headerButton} />
              )}
              <View style={mobileDrawerStyles.headerContent}>
                {!isNestedRoute ? (
                  <Image source={mobileHeaderLogo} style={mobileDrawerStyles.headerLogo} />
                ) : null}
                {headerTitle ? (
                  <Text style={[mobileDrawerStyles.headerTitle, { color: headerTextColor }]} numberOfLines={1}>
                    {headerTitle}
                  </Text>
                ) : null}
              </View>
              <View style={mobileDrawerStyles.headerSpacer} />
            </View>
          ) : null}
          <Tabs
            screenOptions={{
              headerShown: false,
              sceneContainerStyle: zeroTopSceneContainerStyle,
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
            <Tabs.Screen name="index" />
            <Tabs.Screen name="search" />
            <Tabs.Screen name="messages" />
            <Tabs.Screen name="notifications" />
            <Tabs.Screen name="bookmarks" />
            <Tabs.Screen name="post" options={{ href: null }} />
            <Tabs.Screen
              name="profile"
              listeners={() => ({
                tabLongPress: (event) => {
                  event.preventDefault();
                  handleOpenAccountSwitcher();
                },
              })}
            />
            <Tabs.Screen name="settings" options={{ href: null }} />
          </Tabs>
        </View>
      </SafeAreaInsetsContext.Provider>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}

const profileTabIconStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
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
    paddingTop: spacing.sm,
    ...shadows.top,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    width: '100%',
  },
  tabButton: {
    marginHorizontal: spacing.xs,
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
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: touchTarget.min,
    height: touchTarget.min,
  },
});
