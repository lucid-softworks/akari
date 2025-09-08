import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedCardProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
};

export function ThemedCard({
  style,
  lightColor,
  darkColor,
  lightBorderColor,
  darkBorderColor,
  ...otherProps
}: ThemedCardProps) {
  const backgroundColor = useThemeColor(
    {
      light: lightColor || "#ffffff",
      dark: darkColor || "#1a1d1e",
    },
    "background"
  );

  const borderColor = useThemeColor(
    {
      light: lightBorderColor || "#e8eaed",
      dark: darkBorderColor || "#2d3133",
    },
    "background"
  );

  return (
    <View
      style={[styles.card, { backgroundColor, borderColor }, style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
