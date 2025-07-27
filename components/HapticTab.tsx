import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

import { useTabScrollContext } from "@/contexts/TabScrollContext";

type HapticTabProps = BottomTabBarButtonProps & {
  onTabPress?: () => void;
  routeName?: string;
};

export function HapticTab(props: HapticTabProps) {
  const { onTabPress, routeName, ...restProps } = props;
  const { isCurrentTab } = useTabScrollContext();

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
        console.log("Tab pressed:", routeName);

        if (routeName) {
          // Check if this is the current tab being pressed again
          isCurrentTab(routeName);
        }

        restProps.onPress?.(ev);
      }}
    />
  );
}
