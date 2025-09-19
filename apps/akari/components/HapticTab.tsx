import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { StyleSheet, View } from "react-native";

import { useBorderColor } from "@/hooks/useBorderColor";
import { useAppTheme } from "@/theme";

type HapticTabProps = BottomTabBarButtonProps & {
  onTabPress?: () => void;
};

export function HapticTab(props: HapticTabProps) {
  const { onTabPress, style, children, accessibilityState, ...restProps } = props;
  const { colors } = useAppTheme();
  const borderColor = useBorderColor();
  const inactiveBackground = colors.surfaceSecondary;
  const activeBackground = colors.surface;
  const pressedBackground = colors.surfaceHover;
  const accentColor = colors.accent;
  const isActive = accessibilityState?.selected ?? false;

  return (
    <PlatformPressable
      {...restProps}
      style={({ pressed, hovered, focused }) => {
        const composedStyle = [
          styles.base,
          {
            backgroundColor: isActive ? activeBackground : inactiveBackground,
            borderColor: isActive ? accentColor : borderColor,
          },
          pressed && { backgroundColor: pressedBackground },
        ];

        if (typeof style === "function") {
          const computedStyle = style({ pressed, hovered, focused });
          if (Array.isArray(computedStyle)) {
            composedStyle.push(...computedStyle);
          } else if (computedStyle) {
            composedStyle.push(computedStyle);
          }
        } else if (style) {
          composedStyle.push(style as any);
        }

        return composedStyle;
      }}
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
      <View style={styles.indicatorContainer} pointerEvents="none">
        <View
          style={[
            styles.indicator,
            { backgroundColor: isActive ? accentColor : "transparent" },
          ]}
        />
      </View>
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
  indicatorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  indicator: {
    height: 3,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});
