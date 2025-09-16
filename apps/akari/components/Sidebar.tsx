import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TabBadge } from '@/components/TabBadge';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useColorScheme } from '@/hooks/useColorScheme';

const ACCENT_COLOR = '#0a7ea4';

type SidebarItemProps = {
  name: string;
  description?: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  badge?: number;
  isActive: boolean;
  onPress: () => void;
};

function SidebarItem({ name, description, icon, badge, isActive, onPress }: SidebarItemProps) {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const theme = Colors[resolvedScheme];
  const activeBackground =
    resolvedScheme === 'dark' ? 'rgba(10, 126, 164, 0.24)' : 'rgba(10, 126, 164, 0.14)';
  const idleBackground = resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
  const iconBackground =
    resolvedScheme === 'dark' ? 'rgba(10, 126, 164, 0.25)' : 'rgba(10, 126, 164, 0.08)';
  const descriptionColor = isActive
    ? ACCENT_COLOR
    : resolvedScheme === 'dark'
    ? 'rgba(236, 237, 238, 0.65)'
    : '#627489';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: isActive ? activeBackground : idleBackground,
          borderColor: isActive ? ACCENT_COLOR : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {isActive ? <View style={[styles.indicator, { backgroundColor: ACCENT_COLOR }]} /> : null}
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: isActive ? ACCENT_COLOR : iconBackground },
        ]}
      >
        <IconSymbol name={icon} size={18} color={isActive ? '#ffffff' : ACCENT_COLOR} />
        {badge && badge > 0 ? <TabBadge count={badge} size="small" /> : null}
      </View>
      <View style={styles.textWrapper}>
        <ThemedText
          style={[
            styles.label,
            {
              color: isActive ? ACCENT_COLOR : theme.text,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {name}
        </ThemedText>
        {description ? (
          <ThemedText
            numberOfLines={1}
            style={[
              styles.description,
              {
                color: descriptionColor,
              },
            ]}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  const navigationSections = [
    {
      title: 'Discover',
      items: [
        {
          name: 'Home',
          description: 'Your personalized feed',
          icon: 'house.fill' as const,
          path: '/(tabs)',
        },
        {
          name: 'Search',
          description: 'Find people and communities',
          icon: 'magnifyingglass' as const,
          path: '/(tabs)/search',
        },
      ],
    },
    {
      title: 'Inbox',
      items: [
        {
          name: 'Messages',
          description: 'Conversations and requests',
          icon: 'message.fill' as const,
          path: '/(tabs)/messages',
          badge: unreadMessagesCount,
        },
        {
          name: 'Notifications',
          description: 'Mentions and new activity',
          icon: 'bell.fill' as const,
          path: '/(tabs)/notifications',
          badge: unreadNotificationsCount,
        },
      ],
    },
    {
      title: 'You',
      items: [
        {
          name: 'Profile',
          description: 'Manage how others see you',
          icon: 'person.fill' as const,
          path: '/(tabs)/profile',
        },
        {
          name: 'Settings',
          description: 'Adjust your preferences',
          icon: 'gearshape.fill' as const,
          path: '/(tabs)/settings',
        },
      ],
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
      lightColor="#F7FBFF"
      darkColor="rgba(15, 17, 19, 0.92)"
      style={[
        styles.container,
        {
          borderColor:
            resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 126, 164, 0.12)',
          shadowColor: resolvedScheme === 'dark' ? '#000000' : ACCENT_COLOR,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor:
              resolvedScheme === 'dark'
                ? 'rgba(124, 212, 255, 0.14)'
                : 'rgba(10, 126, 164, 0.12)',
          },
        ]}
      />
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              resolvedScheme === 'dark'
                ? 'rgba(10, 126, 164, 0.22)'
                : 'rgba(10, 126, 164, 0.1)',
            borderColor:
              resolvedScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(10, 126, 164, 0.18)',
          },
        ]}
      >
        <View
          style={[
            styles.headerBadge,
            {
              backgroundColor:
                resolvedScheme === 'dark'
                  ? 'rgba(124, 212, 255, 0.16)'
                  : 'rgba(10, 126, 164, 0.18)',
            },
          ]}
        >
          <IconSymbol name="sparkles" size={16} color={ACCENT_COLOR} />
          <ThemedText
            style={[
              styles.headerBadgeText,
              { color: ACCENT_COLOR },
            ]}
          >
            Akari
          </ThemedText>
        </View>
        <ThemedText
          type="subtitle"
          style={[styles.headerTitle, { color: Colors[resolvedScheme].text }]}
        >
          Navigate with ease
        </ThemedText>
        <ThemedText
          style={[
            styles.headerSubtitle,
            {
              color:
                resolvedScheme === 'dark'
                  ? 'rgba(236, 237, 238, 0.75)'
                  : '#567086',
            },
          ]}
        >
          Jump back into conversations, explore the network, and stay on top of updates with a fresh sidebar layout.
        </ThemedText>
      </View>

      {navigationSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText
            style={[
              styles.sectionLabel,
              {
                color:
                  resolvedScheme === 'dark'
                    ? 'rgba(236, 237, 238, 0.55)'
                    : '#5D6F82',
              },
            ]}
          >
            {section.title}
          </ThemedText>
          <View
            style={[
              styles.sectionContent,
              {
                backgroundColor:
                  resolvedScheme === 'dark'
                    ? 'rgba(10, 126, 164, 0.08)'
                    : 'rgba(10, 126, 164, 0.04)',
                borderColor:
                  resolvedScheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(10, 126, 164, 0.08)',
              },
            ]}
          >
            {section.items.map((item) => (
              <SidebarItem
                key={item.path}
                name={item.name}
                description={item.description}
                icon={item.icon}
                badge={item.badge}
                isActive={isActive(item.path)}
                onPress={() => handleNavigation(item.path)}
              />
            ))}
          </View>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 272,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 6,
  },
  glow: {
    position: 'absolute',
    right: -60,
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
  },
  header: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionContent: {
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    position: 'relative',
    marginHorizontal: 6,
    marginVertical: 4,
    borderWidth: 1,
  },
  indicator: {
    position: 'absolute',
    left: -6,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 4,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  textWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
