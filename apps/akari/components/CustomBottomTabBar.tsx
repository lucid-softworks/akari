import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TabBarBackground, { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

type CustomBottomTabBarProps = BottomTabBarProps;
type TabRoute = BottomTabBarProps['state']['routes'][number];

type TabItem = {
  name: TabRoute['name'];
  label: string;
};

const TAB_ITEMS: readonly TabItem[] = [
  { name: 'index', label: 'Home' },
  { name: 'search', label: 'Search' },
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifications' },
  { name: 'profile', label: 'Profile' },
  { name: 'settings', label: 'Settings' },
] as const;

export function CustomBottomTabBar({ state, descriptors, navigation, insets, style }: CustomBottomTabBarProps) {
  const activeContentColor = useThemeColor({ light: '#FFFFFF', dark: '#F4F4F5' }, 'text');
  const inactiveColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const surfaceColor = useThemeColor({ light: '#FFFFFF', dark: '#0F1115' }, 'background');
  const borderColor = useBorderColor();
  const overflow = useBottomTabOverflow();
  const bottomInset = Math.max(insets.bottom - overflow, 0);

  const handleNavigate = useCallback(
    (route: TabRoute, isFocused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never, route.params as never);
      }

      if (isFocused) {
        tabScrollRegistry.handleTabPress(route.name);
      }
    },
    [navigation],
  );

  const BackgroundComponent = TabBarBackground;
  const shouldRenderOverlayBackground = Platform.OS === 'ios' && Boolean(BackgroundComponent);
  const containerBackground = shouldRenderOverlayBackground ? 'transparent' : surfaceColor;

  return (
    <View
      style={[
        styles.outer,
        style,
        {
          paddingBottom: bottomInset + 12,
          backgroundColor: containerBackground,
          borderTopWidth: shouldRenderOverlayBackground ? 0 : StyleSheet.hairlineWidth,
          borderColor: shouldRenderOverlayBackground ? undefined : borderColor,
        },
      ]}
    >
      {shouldRenderOverlayBackground ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BackgroundComponent />
        </View>
      ) : null}
      <ThemedView
        style={[
          styles.surface,
          {
            borderColor,
            backgroundColor: surfaceColor,
          },
        ]}
      >
        {TAB_ITEMS.map((item) => {
          const routeIndex = state.routes.findIndex((route) => route.name === item.name);

          if (routeIndex === -1) {
            return null;
          }

          const route = state.routes[routeIndex];
          const descriptor = descriptors[route.key];
          const { options } = descriptor;
          const isFocused = state.index === routeIndex;

          const label = item.label;

          const accessibilityLabel = options.tabBarAccessibilityLabel ?? label;
          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? activeContentColor : inactiveColor,
            size: 26,
          });

          return (
            <PlatformPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{ selected: isFocused }}
              testID={options.tabBarTestID}
              onPressIn={() => {
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              onPress={() => handleNavigate(route, isFocused)}
              onLongPress={() => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              }}
              style={({ pressed }) => [
                styles.tabButton,
                {
                  backgroundColor: isFocused ? accentColor : 'transparent',
                  borderColor: isFocused ? accentColor : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.tabContent}>
                <View style={styles.iconContainer}>{icon}</View>
                {isFocused ? (
                  <ThemedText
                    style={[
                      styles.label,
                      {
                        color: activeContentColor,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </ThemedText>
                ) : null}
              </View>
            </PlatformPressable>
          );
        })}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    padding: 6,
    gap: 6,
    overflow: 'hidden',
    shadowColor: 'rgba(12, 14, 24, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
