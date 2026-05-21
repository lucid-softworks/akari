import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { TabBadge } from '@/components/TabBadge';
import { ProfileTabIcon } from '@/components/tabs/ProfileTabIcon';
import { TabBarIcon } from '@/components/tabs/TabBarIcon';
import { spacing } from '@/constants/tokens';
import type { TabKey } from '@/hooks/useTabConfig';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const TAB_ICONS: Record<TabKey, string> = {
  index: 'house',
  search: 'magnifyingglass',
  messages: 'message.fill',
  notifications: 'bell',
  bookmarks: 'bookmark.fill',
  profile: 'person.fill',
  'community-notes': 'info.circle.fill',
  moderation: 'shield.fill',
  settings: 'gearshape.fill',
};

type TabButtonProps = {
  tabKey: TabKey;
  route: { key: string; name: string };
  isFocused: boolean;
  color: string;
  badgeCount: number;
  avatarUri?: string;
  navigation: BottomTabBarProps['navigation'];
};

export const TabButton = React.memo(function TabButton({
  tabKey,
  route,
  isFocused,
  color,
  badgeCount,
  avatarUri,
  navigation,
}: TabButtonProps) {
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
      style={styles.tabButton}
    >
      <View style={styles.iconContainer}>
        {tabKey === 'profile' ? (
          <ProfileTabIcon color={color} focused={isFocused} avatarUri={avatarUri} />
        ) : badgeCount > 0 ? (
          <View style={styles.badgeWrapper}>
            <TabBarIcon name={TAB_ICONS[tabKey] as any} color={color} />
            <TabBadge count={badgeCount} size="small" />
          </View>
        ) : (
          <TabBarIcon name={TAB_ICONS[tabKey] as any} color={color} />
        )}
      </View>
    </HapticTab>
  );
});

const styles = StyleSheet.create({
  tabButton: {
    marginHorizontal: spacing.xs,
    marginVertical: 0,
    paddingVertical: 0,
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
