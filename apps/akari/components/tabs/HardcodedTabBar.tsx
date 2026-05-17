import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TabBarBackground from '@/components/ui/TabBarBackground';
import { TabButton } from '@/components/tabs/TabButton';
import { shadows, spacing } from '@/constants/tokens';
import type { TabKey } from '@/hooks/useTabConfig';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

type HardcodedTabBarProps = BottomTabBarProps & {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  avatarUri?: string;
  visibleTabs: TabKey[];
};

export function HardcodedTabBar({
  state,
  navigation,
  unreadMessagesCount,
  unreadNotificationsCount,
  avatarUri,
  visibleTabs,
}: HardcodedTabBarProps) {
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const inactiveTint = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tabBarSurface = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const TabBarBackgroundComponent = TabBarBackground as React.ComponentType | undefined;

  // iOS Safari standalone PWAs have been seen to over-report
  // safe-area-inset-bottom (sometimes by 100px+), leaving a tall
  // empty band below the nav. The home indicator is at most ~34dp
  // anywhere, so cap web's bottom inset.
  const bottomInset = Platform.OS === 'web' ? Math.min(insets.bottom, 32) : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : tabBarSurface,
          paddingLeft: Math.max(spacing.lg, insets.left + spacing.sm),
          paddingRight: Math.max(spacing.lg, insets.right + spacing.sm),
          paddingBottom: spacing.sm + bottomInset,
        },
      ]}
    >
      {Platform.OS === 'ios' && TabBarBackgroundComponent ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <TabBarBackgroundComponent />
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={styles.tabList}>
          {visibleTabs.map((tabKey) => {
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

const styles = StyleSheet.create({
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
  tabList: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
});
