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

const ACCENT_LIGHT = '#4E5AF7';
const ACCENT_DARK = '#A6B1FF';

type SidebarItemProps = {
  name: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  badge?: number;
  shortcut?: string;
  isActive: boolean;
  onPress: () => void;
};

function SidebarItem({ name, icon, badge, shortcut, isActive, onPress }: SidebarItemProps) {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const theme = Colors[resolvedScheme];
  const accentColor = resolvedScheme === 'dark' ? ACCENT_DARK : ACCENT_LIGHT;
  const inactiveText = resolvedScheme === 'dark' ? 'rgba(224, 228, 244, 0.68)' : '#586075';
  const shortcutColor = resolvedScheme === 'dark' ? 'rgba(196, 202, 225, 0.65)' : '#8A92AB';
  const iconColor = isActive
    ? accentColor
    : resolvedScheme === 'dark'
    ? 'rgba(177, 184, 205, 0.7)'
    : '#9AA2BE';
  const activeBackground = resolvedScheme === 'dark' ? 'rgba(78, 90, 247, 0.18)' : 'rgba(78, 90, 247, 0.12)';
  const pressedBackground = resolvedScheme === 'dark' ? 'rgba(78, 90, 247, 0.08)' : 'rgba(78, 90, 247, 0.06)';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: isActive ? activeBackground : pressed ? pressedBackground : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.itemIndicator,
          { backgroundColor: accentColor, opacity: isActive ? 1 : 0 },
        ]}
      />
      <View style={styles.iconSlot}>
        <IconSymbol name={icon} size={18} color={iconColor} />
        {badge && badge > 0 ? <TabBadge count={badge} size="small" /> : null}
      </View>
      <ThemedText
        style={[
          styles.label,
          {
            color: isActive ? theme.text : inactiveText,
            fontWeight: isActive ? '600' : '500',
          },
        ]}
      >
        {name}
      </ThemedText>
      {shortcut ? (
        <ThemedText style={[styles.shortcut, { color: shortcutColor }]}>{shortcut}</ThemedText>
      ) : null}
    </Pressable>
  );
}

type NavigationSection = {
  title: string;
  items: Array<{
    name: string;
    icon: React.ComponentProps<typeof IconSymbol>['name'];
    path: string;
    badge?: number;
    shortcut?: string;
  }>;
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? 'light';
  const theme = Colors[resolvedScheme];
  const accentColor = resolvedScheme === 'dark' ? ACCENT_DARK : ACCENT_LIGHT;
  const dividerColor = resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(78, 90, 247, 0.08)';
  const workspaceFill = resolvedScheme === 'dark' ? 'rgba(78, 90, 247, 0.16)' : 'rgba(78, 90, 247, 0.08)';
  const workspaceMeta = resolvedScheme === 'dark' ? 'rgba(204, 210, 232, 0.72)' : '#6D748B';
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  const navigationSections: NavigationSection[] = [
    {
      title: 'Focus',
      items: [
        {
          name: 'Home',
          icon: 'house.fill',
          path: '/(tabs)',
          shortcut: '⌘1',
        },
        {
          name: 'Search',
          icon: 'magnifyingglass',
          path: '/(tabs)/search',
          shortcut: '⌘K',
        },
      ],
    },
    {
      title: 'Updates',
      items: [
        {
          name: 'Messages',
          icon: 'message.fill',
          path: '/(tabs)/messages',
          badge: unreadMessagesCount,
          shortcut: '⌘2',
        },
        {
          name: 'Notifications',
          icon: 'bell.fill',
          path: '/(tabs)/notifications',
          badge: unreadNotificationsCount,
          shortcut: '⌘3',
        },
      ],
    },
    {
      title: 'Workspace',
      items: [
        {
          name: 'Profile',
          icon: 'person.fill',
          path: '/(tabs)/profile',
        },
        {
          name: 'Settings',
          icon: 'gearshape.fill',
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
      lightColor="#F8FAFF"
      darkColor="rgba(17, 20, 28, 0.92)"
      style={[
        styles.container,
        {
          borderColor: resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(78, 90, 247, 0.08)',
          shadowColor: resolvedScheme === 'dark' ? '#0B0D16' : '#1A1F3D',
        },
      ]}
    >
      <View
        style={[
          styles.workspace,
          {
            backgroundColor: workspaceFill,
          },
        ]}
      >
        <View style={[styles.workspaceAvatar, { backgroundColor: accentColor }]}>
          <ThemedText style={styles.workspaceInitials}>AK</ThemedText>
        </View>
        <View style={styles.workspaceDetails}>
          <ThemedText
            style={[
              styles.workspaceName,
              { color: theme.text },
            ]}
          >
            Akari
          </ThemedText>
          <ThemedText style={[styles.workspaceMeta, { color: workspaceMeta }]}>Product workspace</ThemedText>
        </View>
        <IconSymbol name="chevron.down" size={16} color={workspaceMeta} />
      </View>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {navigationSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText
            style={[
              styles.sectionLabel,
              {
                color: resolvedScheme === 'dark' ? 'rgba(208, 214, 235, 0.6)' : '#7B849C',
              },
            ]}
          >
            {section.title}
          </ThemedText>
          <View style={styles.sectionItems}>
            {section.items.map((item) => (
              <SidebarItem
                key={item.path}
                name={item.name}
                icon={item.icon}
                badge={item.badge}
                shortcut={item.shortcut}
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
    width: 256,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 4,
  },
  workspace: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  workspaceAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workspaceInitials: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  workspaceDetails: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  workspaceMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionItems: {
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    marginBottom: 4,
  },
  itemIndicator: {
    position: 'absolute',
    left: 6,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 999,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
  shortcut: {
    fontSize: 12,
    fontWeight: '500',
  },
});
