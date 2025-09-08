import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { TabBadge } from '@/components/TabBadge';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useColorScheme } from '@/hooks/useColorScheme';

interface SidebarItemProps {
  name: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  path: string;
  badge?: number;
  isActive: boolean;
  onPress: () => void;
}

function SidebarItem({ name, icon, path, badge, isActive, onPress }: SidebarItemProps) {
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor = Colors[colorScheme ?? 'light'].text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 2,
          backgroundColor: isActive ? activeColor + '20' : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ position: 'relative' }}>
        <IconSymbol name={icon} size={20} color={isActive ? activeColor : inactiveColor} />
        {badge && badge > 0 ? <TabBadge count={badge} size="small" /> : null}
      </View>
      <ThemedText
        style={{
          marginLeft: 12,
          fontSize: 16,
          fontWeight: isActive ? '600' : '400',
          color: isActive ? activeColor : inactiveColor,
        }}
      >
        {name}
      </ThemedText>
    </Pressable>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  const navigationItems = [
    {
      name: 'Home',
      icon: 'house.fill' as const,
      path: '/(tabs)',
      badge: undefined,
    },
    {
      name: 'Search',
      icon: 'magnifyingglass' as const,
      path: '/(tabs)/search',
      badge: undefined,
    },
    {
      name: 'Messages',
      icon: 'message.fill' as const,
      path: '/(tabs)/messages',
      badge: unreadMessagesCount,
    },
    {
      name: 'Notifications',
      icon: 'bell.fill' as const,
      path: '/(tabs)/notifications',
      badge: unreadNotificationsCount,
    },
    {
      name: 'Profile',
      icon: 'person.fill' as const,
      path: '/(tabs)/profile',
      badge: undefined,
    },
    {
      name: 'Settings',
      icon: 'gearshape.fill' as const,
      path: '/(tabs)/settings',
      badge: undefined,
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  const isActive = (path: string) => {
    if (path === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === path;
  };

  return (
    <ThemedView
      style={{
        width: 240,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        borderWidth: 1,
        borderColor: Colors[colorScheme ?? 'light'].border,
      }}
    >
      {navigationItems.map((item) => (
        <SidebarItem
          key={item.path}
          name={item.name}
          icon={item.icon}
          path={item.path}
          badge={item.badge}
          isActive={isActive(item.path)}
          onPress={() => handleNavigation(item.path)}
        />
      ))}
    </ThemedView>
  );
}
