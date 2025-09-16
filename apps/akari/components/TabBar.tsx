import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";

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
  const borderColor = useBorderColor();
  const surfaceColor = useThemeColor({ light: "#F3F4F6", dark: "#141720" }, "background");
  const activeBackground = useThemeColor({ light: "#FFFFFF", dark: "#1E2537" }, "background");
  const inactiveTextColor = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");
  const activeTextColor = useThemeColor({ light: "#111827", dark: "#F4F4F5" }, "text");
  const accentColor = useThemeColor({ light: "#7C8CF9", dark: "#7C8CF9" }, "tint");
  const accentShadowColor = useThemeColor(
    { light: "rgba(124, 140, 249, 0.25)", dark: "rgba(12, 14, 24, 0.55)" },
    "background"
  );

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
                isActive
                  ? [
                      styles.tabActive,
                      {
                        backgroundColor: activeBackground,
                        borderColor: accentColor,
                        shadowColor: accentShadowColor,
                      },
                    ]
                  : styles.tabInactive,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  tabSpacing: {
    marginRight: 8,
  },
  tabActive: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  tabInactive: {
    opacity: 0.9,
  },
  tabText: {
    fontSize: 15,
  },
});
