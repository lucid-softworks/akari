import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedCardProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedCard({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedCardProps) {
  const backgroundColor = useThemeColor(
    {
      light: lightColor || "#f8f9fa",
      dark: darkColor || "#2a2d2e",
    },
    "background"
  );

  return (
    <View style={[styles.card, { backgroundColor }, style]} {...otherProps} />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
});
