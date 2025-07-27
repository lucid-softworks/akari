import React from "react";
import { StyleSheet } from "react-native";

import { Label } from "@/components/Label";
import { ThemedView } from "@/components/ThemedView";

type LabelData = {
  /** The label text */
  val: string;
  /** The label source/creator */
  src: string;
  /** When the label was created */
  cts: string;
  /** The label URI */
  uri: string;
  /** The label CID (optional - not always present) */
  cid?: string;
  /** Whether the label is negative */
  neg?: boolean;
  /** Alternative label text properties */
  value?: string;
  text?: string;
  label?: string;
  /** Version (optional) */
  ver?: number;
  /** Expiration (optional) */
  exp?: string;
};

type LabelsProps = {
  /** Array of label data from the Bluesky API */
  labels?: LabelData[];
  /** Maximum number of labels to display */
  maxLabels?: number;
};

/**
 * Component for displaying multiple profile labels
 */
export function Labels({ labels, maxLabels = 5 }: LabelsProps) {
  if (!labels || labels.length === 0) {
    return null;
  }

  // Filter and limit labels
  const displayLabels = labels
    .filter((label) => {
      // Handle different possible label structures
      const labelText =
        label.val || label.value || label.text || label.label || label;
      return (
        labelText && typeof labelText === "string" && labelText.trim() !== ""
      );
    })
    .slice(0, maxLabels);

  if (displayLabels.length === 0) {
    return null;
  }

  // Helper function to determine label styling
  const getLabelProps = (label: LabelData) => {
    // Handle different possible label structures
    const labelText =
      label.val || label.value || label.text || label.label || "";
    const text = typeof labelText === "string" ? labelText.toLowerCase() : "";

    // Check for warning/negative labels
    if (
      label.neg ||
      text.includes("spam") ||
      text.includes("bot") ||
      text.includes("suspended")
    ) {
      return { text: labelText, isWarning: true };
    }

    // Check for positive/verified labels
    if (
      text.includes("verified") ||
      text.includes("official") ||
      text.includes("trusted")
    ) {
      return { text: labelText, isPositive: true };
    }

    // Default label
    return { text: labelText };
  };

  return (
    <ThemedView style={styles.container}>
      {displayLabels.map((label, index) => (
        <Label
          key={`${label.uri || label.cid || index}-${index}`}
          {...getLabelProps(label)}
        />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginTop: 8,
  },
});
