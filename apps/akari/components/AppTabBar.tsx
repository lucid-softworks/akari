import { useNavigation, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { HapticTab } from '@/components/HapticTab';
import { Sidebar } from '@/components/Sidebar';
import { TabBadge } from '@/components/TabBadge';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTabContext } from '@/contexts/TabContext';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

function TabBarIcon({ name, color }: { name: string; color: string }) {
  return <IconSymbol name={name} size={24} color={color} />;
}

function ProfileTabIcon({ color, focused, avatarUri }: { color: string; focused: boolean; avatarUri?: string }) {
  if (avatarUri) {
    return (
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: focused ? 2 : 1,
          borderColor: color,
          overflow: 'hidden',
        }}
      >
        {/* You would render the avatar image here */}
      </View>
    );
  }
  return <TabBarIcon name="person.fill" color={color} />;
}

type TabKey = 'index' | 'search' | 'messages' | 'notifications' | 'profile' | 'settings';

export function AppTabBar() {
  const { t } = useTranslation();
  const { isLargeScreen, width, height } = useResponsive();
  const { data: authStatus, isLoading: isAuthLoading } = useAuthStatus();

  const { data: currentAccount } = useCurrentAccount();
  const { data: unreadMessagesCount } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount } = useUnreadNotificationsCount();
  const [isAccountSwitcherVisible, setIsAccountSwitcherVisible] = useState(false);
  const { activeTab, setActiveTab, navigateToTab, updateTabState } = useTabContext();
  const navigation = useNavigation();
  const router = useRouter();
  const pathname = usePathname();

  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');
  const insets = useSafeAreaInsets();

  const TabBarBackgroundComponent = TabBarBackground as React.ComponentType | undefined;

  const handleOpenAccountSwitcher = useCallback(() => {
    setIsAccountSwitcherVisible(true);
  }, []);

  const handleCloseAccountSwitcher = useCallback(() => {
    setIsAccountSwitcherVisible(false);
  }, []);

  if (isAuthLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  // Always show tab bar on mobile, even when not authenticated
  // This allows navigation to login screen
  if (!authStatus?.isAuthenticated && isLargeScreen) {
    return null;
  }

  // For large screens, show sidebar instead of tab bar
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
              {/* Content will be rendered by the individual screens */}
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  const tabs: TabKey[] = ['index', 'search', 'messages', 'notifications', 'profile', 'settings'];

  const handleTabPress = (tabKey: TabKey) => {
    const currentTab = pathname.split('/')[1] || 'index';

    if (currentTab === tabKey) {
      tabScrollRegistry.handleTabPress(tabKey);
    } else {
      // Use the tab context to navigate to the remembered route for this tab
      const route = navigateToTab(tabKey);

      // Two-step navigation approach:
      // 1. First navigate to the tab's base route (instant, no animation)
      // 2. Then navigate to the specific route within that tab
      const baseRoute = tabKey === 'index' ? '/' : `/${tabKey}`;

      if (route !== baseRoute) {
        // If we need to go to a specific route within the tab, do two-step navigation
        // First go to base route (instant) - use replace to avoid adding to global stack
        router.replace(baseRoute);
        // Then navigate to the specific route using microtask to avoid flash
        // Use push for the final step so swipe-back works properly
        Promise.resolve().then(() => {
          router.push(route);
          // Update the tab state to the final route
          updateTabState(tabKey, route);
        });
      } else {
        // If we're just going to the base route, do it directly
        router.replace(baseRoute);
      }
    }
  };

  const handleProfileLongPress = () => {
    handleOpenAccountSwitcher();
  };

  return (
    <>
      <View
        style={[
          tabBarStyles.container,
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
        <View style={tabBarStyles.content}>
          {tabs.map((tabKey) => {
            // Handle home route detection - if pathname is '/' or '/index', it's the home tab
            const currentTab = pathname === '/' || pathname === '/index' ? 'index' : pathname.split('/')[1] || 'index';
            const isOnPostRoute = pathname.includes('/post/');

            let isFocused = currentTab === tabKey;

            if (isOnPostRoute) {
              // When on a post route, use the context to determine which tab should be highlighted
              isFocused = activeTab === tabKey;
            }

            const color = isFocused ? accentColor : inactiveTint;
            const badgeCount =
              tabKey === 'messages'
                ? unreadMessagesCount || 0
                : tabKey === 'notifications'
                ? unreadNotificationsCount || 0
                : 0;

            const handlePress = () => handleTabPress(tabKey);
            const handleLongPress = tabKey === 'profile' ? handleProfileLongPress : undefined;

            return (
              <HapticTab
                key={tabKey}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                onPress={handlePress}
                onLongPress={handleLongPress}
                style={tabBarStyles.tabButton}
              >
                <View style={tabBarStyles.iconContainer}>
                  {tabKey === 'messages' || tabKey === 'notifications' ? (
                    <View style={tabBarStyles.badgeWrapper}>
                      <TabBarIcon name={tabKey === 'messages' ? 'message.fill' : 'bell.fill'} color={color} />
                      <TabBadge count={badgeCount} size="small" />
                    </View>
                  ) : tabKey === 'profile' ? (
                    <ProfileTabIcon color={color} focused={isFocused} avatarUri={currentAccount?.avatar} />
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
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    position: 'relative',
  },
});
