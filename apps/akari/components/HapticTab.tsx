import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useBorderColor } from "@/hooks/useBorderColor";
import { useThemeColor } from "@/hooks/useThemeColor";

type HapticTabProps = BottomTabBarButtonProps & {
  onTabPress?: () => void;
};

type PressableState = { pressed: boolean; hovered?: boolean; focused?: boolean };

export function HapticTab(props: HapticTabProps) {
  const { onTabPress, style, children, accessibilityState, ...restProps } = props;
  const borderColor = useBorderColor();
  const inactiveBackground = useThemeColor({ light: "#F3F4F6", dark: "#111827" }, "background");
  const activeBackground = useThemeColor({ light: "#FFFFFF", dark: "#1E2537" }, "background");
  const pressedBackground = useThemeColor({ light: "#E5E7EB", dark: "#1B2332" }, "background");
  const accentColor = useThemeColor({ light: "#7C8CF9", dark: "#7C8CF9" }, "tint");
  const isActive = accessibilityState?.selected ?? false;

  // PlatformPressable's `style` prop is typed for animated/static values only,
  // but at runtime it forwards everything through to a Pressable that accepts
  // a function-of-state. Cast to silence TS — this is the documented Pressable
  // API and matches the original implementation.
  const styleFn = (state: PressableState): StyleProp<ViewStyle> => {
    const composed: StyleProp<ViewStyle>[] = [
      styles.base,
      {
        backgroundColor: isActive ? activeBackground : inactiveBackground,
        borderColor: isActive ? accentColor : borderColor,
      },
      state.pressed ? { backgroundColor: pressedBackground } : null,
    ];

    if (typeof style === "function") {
      const parentStyle = (style as (s: PressableState) => StyleProp<ViewStyle>)(state);
      if (parentStyle) composed.push(parentStyle);
    } else if (style) {
      composed.push(style as StyleProp<ViewStyle>);
    }

    return composed;
  };

  return (
    <PlatformPressable
      {...restProps}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={styleFn as any}
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
