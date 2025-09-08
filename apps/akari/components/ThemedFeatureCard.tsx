import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedFeatureCardProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedFeatureCard({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedFeatureCardProps) {
  const backgroundColor = useThemeColor(
    {
      light: lightColor || "#f8f9fa",
      dark: darkColor || "#2a2d2e",
    },
    "background"
  );

  return (
    <View
      style={[styles.featureCard, { backgroundColor }, style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
});
