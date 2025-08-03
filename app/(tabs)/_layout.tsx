import { useNavigationState } from '@react-navigation/native';
import { Redirect, Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { TabBadge } from '@/components/TabBadge';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useColorScheme } from '@/hooks/useColorScheme';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

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
  const colorScheme = useColorScheme();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  if (isLoading) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </ThemedView>
    );
  }

  // Don't render tabs if not authenticated or still loading
  if (!authStatus?.isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: CustomTabButton,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
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
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
