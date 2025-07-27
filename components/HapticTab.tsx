import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

type HapticTabProps = BottomTabBarButtonProps & {
  onTabPress?: () => void;
};

export function HapticTab(props: HapticTabProps) {
  const { onTabPress, ...restProps } = props;

  return (
    <PlatformPressable
      {...restProps}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        restProps.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        console.log("HapticTab pressed, calling onTabPress");
        // Call the tab press handler if provided
        onTabPress?.();
        restProps.onPress?.(ev);
      }}
    />
  );
}
