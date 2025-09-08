import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

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
  const activeColor = useThemeColor({}, "tint");
  const inactiveColor = useThemeColor({}, "text");

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                {
                  color: activeTab === tab.key ? activeColor : inactiveColor,
                  fontWeight: activeTab === tab.key ? "600" : "400",
                },
              ]}
            >
              {tab.label}
            </ThemedText>
            {activeTab === tab.key && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: activeColor },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "relative",
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 2,
    borderRadius: 1,
  },
});
