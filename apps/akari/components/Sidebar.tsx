import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TabBadge } from '@/components/TabBadge';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';

const monochromePalette = {
  surface: '#090A0D',
  itemSurface: '#0F1117',
  activeBackground: '#161922',
  pressedBackground: '#12151D',
  border: '#1C1F26',
  indicator: '#F4F5F7',
  textPrimary: '#F4F5F7',
  textSecondary: '#C7CBD6',
  shortcut: '#636774',
  iconActive: '#F4F5F7',
  iconInactive: '#7B7F8D',
  sectionLabel: '#6B7080',
  workspaceMeta: '#8E93A3',
  divider: '#151820',
  workspaceSurface: '#10131A',
  workspaceAvatar: '#181B24',
  workspaceIcon: '#7B7F8D',
} as const;

type SidebarPalette = typeof monochromePalette;

type SidebarItemProps = {
  name: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  badge?: number;
  shortcut?: string;
  isActive: boolean;
  onPress: () => void;
  palette: SidebarPalette;
};

function SidebarItem({ name, icon, badge, shortcut, isActive, onPress, palette }: SidebarItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: isActive
            ? palette.activeBackground
            : pressed
            ? palette.pressedBackground
            : palette.itemSurface,
          borderColor: palette.border,
        },
      ]}
    >
      <View
        style={[
          styles.itemIndicator,
          { backgroundColor: palette.indicator, opacity: isActive ? 1 : 0 },
        ]}
      />
      <View style={styles.iconSlot}>
        <IconSymbol name={icon} size={18} color={isActive ? palette.iconActive : palette.iconInactive} />
        {badge && badge > 0 ? <TabBadge count={badge} size="small" /> : null}
      </View>
      <ThemedText
        style={[
          styles.label,
          {
            color: isActive ? palette.textPrimary : palette.textSecondary,
            fontWeight: isActive ? '600' : '500',
          },
        ]}
      >
        {name}
      </ThemedText>
      {shortcut ? (
        <ThemedText style={[styles.shortcut, { color: palette.shortcut }]}>{shortcut}</ThemedText>
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
      lightColor={monochromePalette.surface}
      darkColor={monochromePalette.surface}
      style={[
        styles.container,
        {
          borderColor: monochromePalette.border,
          backgroundColor: monochromePalette.surface,
          shadowColor: '#000000',
        },
      ]}
    >
      <View
        style={[
          styles.workspace,
          {
            backgroundColor: monochromePalette.workspaceSurface,
            borderColor: monochromePalette.border,
          },
        ]}
      >
        <View
          style={[
            styles.workspaceAvatar,
            {
              backgroundColor: monochromePalette.workspaceAvatar,
              borderColor: monochromePalette.border,
            },
          ]}
        >
          <ThemedText style={styles.workspaceInitials}>AK</ThemedText>
        </View>
        <View style={styles.workspaceDetails}>
          <ThemedText
            style={[
              styles.workspaceName,
              { color: monochromePalette.textPrimary },
            ]}
          >
            Akari
          </ThemedText>
          <ThemedText
            style={[
              styles.workspaceMeta,
              { color: monochromePalette.workspaceMeta },
            ]}
          >
            Product workspace
          </ThemedText>
        </View>
        <IconSymbol name="chevron.down" size={16} color={monochromePalette.workspaceIcon} />
      </View>

      <View style={[styles.divider, { backgroundColor: monochromePalette.divider }]} />

      {navigationSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText
            style={[
              styles.sectionLabel,
              { color: monochromePalette.sectionLabel },
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
                palette={monochromePalette}
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
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.38,
    shadowRadius: 48,
    elevation: 12,
  },
  workspace: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  workspaceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  workspaceInitials: {
    color: '#F4F5F7',
    fontWeight: '600',
    fontSize: 14,
  },
  workspaceDetails: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  workspaceMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionItems: {
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
    marginBottom: 6,
    borderWidth: 1,
  },
  itemIndicator: {
    position: 'absolute',
    left: 10,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 999,
  },
  iconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
  shortcut: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
