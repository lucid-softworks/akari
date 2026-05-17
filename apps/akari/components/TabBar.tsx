import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing, fontSize, fontWeight, activeOpacity } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Tab item configuration
 */
type TabItem<T extends string> = {
  key: T;
  label: string;
};

/**
 * Props for the TabBar component
 */
type TabBarProps<T extends string> = {
  /** Array of tab items to display */
  tabs: TabItem<T>[];
  /** Currently active tab */
  activeTab: T;
  /** Callback when a tab is pressed */
  onTabChange: (tab: T) => void;
};

/**
 * Reusable tab bar component using scrollable layout with profile-style indicators
 */
export function TabBar<T extends string>({ tabs: tabsProp, activeTab, onTabChange }: TabBarProps<T>) {
  const borderColor = useBorderColor();
  const surfaceColor = useThemeColor({}, 'background');
  const inactiveTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const activeTextColor = useThemeColor({ light: '#111827', dark: '#F4F4F5' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');

  const tabs = tabsProp.reduce((acc, tab) => {
    if (acc.find((t) => t.key === tab.key)) {
      return acc;
    }
    acc.push(tab);
    return acc;
  }, [] as TabItem<T>[]);

  return (
    <ThemedView
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor: surfaceColor,
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          const isLast = index === tabs.length - 1;

          return (
            <Pressable
              key={tab.key}
              testID={`tab-${tab.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              
              onPress={() => onTabChange(tab.key)}
              style={({ pressed }) => [styles.tab,
                !isLast ? styles.tabSpacing : undefined,
                { borderBottomColor: isActive ? accentColor : 'transparent' }, pressed && { opacity: activeOpacity.subtle }]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color: isActive ? activeTextColor : inactiveTextColor,
                    fontWeight: isActive ? fontWeight.semibold : fontWeight.medium,
                  },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSpacing: {
    marginRight: spacing.xxl,
  },
  tabText: {
    fontSize: fontSize.base + 1,
  },
});
