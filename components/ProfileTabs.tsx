import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";

type TabType = "posts" | "replies" | "likes" | "media";

type ProfileTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const borderColor = useBorderColor();
  const activeColor = useThemeColor({}, "tint");
  const inactiveColor = useThemeColor({}, "text");

  const tabs: { key: TabType; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "replies", label: "Replies" },
    { key: "likes", label: "Likes" },
    { key: "media", label: "Media" },
  ];

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
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
              style={[styles.activeIndicator, { backgroundColor: activeColor }]}
            />
          )}
        </TouchableOpacity>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
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
