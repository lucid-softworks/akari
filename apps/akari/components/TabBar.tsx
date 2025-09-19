import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBorderColor } from "@/hooks/useBorderColor";
import { useAppTheme } from "@/theme";

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
export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: TabBarProps<T>) {
  const { colors } = useAppTheme();
  const borderColor = useBorderColor();
  const surfaceColor = colors.surface;
  const inactiveTextColor = colors.textMuted;
  const activeTextColor = colors.text;
  const accentColor = colors.accent;

  return (
    <ThemedView
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor: surfaceColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          const isLast = index === tabs.length - 1;

          return (
            <TouchableOpacity
              key={tab.key}
              testID={`tab-${tab.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.85}
              onPress={() => onTabChange(tab.key)}
              style={[
                styles.tab,
                !isLast ? styles.tabSpacing : undefined,
                { borderBottomColor: isActive ? accentColor : "transparent" },
              ]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color: isActive ? activeTextColor : inactiveTextColor,
                    fontWeight: isActive ? "600" : "500",
                  },
                ]}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
    zIndex: 10,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  tabSpacing: {
    marginRight: 24,
  },
  tabText: {
    fontSize: 15,
  },
});
