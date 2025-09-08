import React from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

type LabelProps = {
  /** The label text to display */
  text: string;
  /** The label color (optional - will use default if not provided) */
  color?: string;
  /** Whether this is a warning/negative label */
  isWarning?: boolean;
  /** Whether this is a positive/verified label */
  isPositive?: boolean;
};

/**
 * Component for displaying profile labels
 */
export function Label({ text, color, isWarning, isPositive }: LabelProps) {
  const backgroundColor = useThemeColor(
    {
      light: isWarning ? "#ffebee" : isPositive ? "#e8f5e8" : "#f0f0f0",
      dark: isWarning ? "#2d1b1b" : isPositive ? "#1b2d1b" : "#2a2a2a",
    },
    "background"
  );

  const textColor = useThemeColor(
    {
      light: isWarning ? "#c62828" : isPositive ? "#2e7d32" : "#666666",
      dark: isWarning ? "#ef5350" : isPositive ? "#81c784" : "#cccccc",
    },
    "text"
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: color || backgroundColor,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.text,
          {
            color: color ? "#ffffff" : textColor,
          },
        ]}
      >
        {text}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
