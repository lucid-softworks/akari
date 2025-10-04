import { useNavigationState } from '@react-navigation/native';
import { Redirect, Tabs } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

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
        if (lastPressedTabRef.current === currentRoute) {
          tabScrollRegistry.handleTabPress(currentRoute);
        }

        lastPressedTabRef.current = currentRoute;
      }
    }, 50); // Small delay to ensure navigation state has updated
  };

  return <HapticTab {...props} onTabPress={handleTabPress} />;
}

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: currentAccount } = useCurrentAccount();
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
