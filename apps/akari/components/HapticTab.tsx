import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";

type HapticTabProps = BottomTabBarButtonProps & {
  onTabPress?: () => void;
};

export function HapticTab(props: HapticTabProps) {
  const { onTabPress, style, children, accessibilityState, ...restProps } = props;
  const borderColor = useBorderColor();
  const inactiveBackground = useThemeColor({ light: "#F3F4F6", dark: "#111827" }, "background");
  const activeBackground = useThemeColor({ light: "#FFFFFF", dark: "#1E2537" }, "background");
  const pressedBackground = useThemeColor({ light: "#E5E7EB", dark: "#1B2332" }, "background");
  const accentColor = useThemeColor({ light: "#7C8CF9", dark: "#7C8CF9" }, "tint");
  const isActive = accessibilityState?.selected ?? false;

  // PlatformPressable accepts a single style value rather than a function-of-state
  // like react-native's Pressable, so build the static composition once. Pressed
  // styling is delegated to PlatformPressable's pressColor below.
  const composedStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: isActive ? activeBackground : inactiveBackground,
      borderColor: isActive ? accentColor : borderColor,
    },
    typeof style !== "function" ? (style as StyleProp<ViewStyle>) : null,
  ];

  return (
    <PlatformPressable
      {...restProps}
      style={composedStyle}
      pressColor={pressedBackground}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        restProps.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        onTabPress?.();
        restProps.onPress?.(ev);
      }}
    >
      <View style={styles.content}>{children}</View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    marginHorizontal: 6,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});
