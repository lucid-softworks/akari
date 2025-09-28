import { StyleSheet, View } from 'react-native';

import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SolidTabBarBackground() {
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor(
    { light: 'rgba(249, 250, 251, 0.94)', dark: 'rgba(15, 17, 21, 0.88)' },
    'background',
  );

  return (
    <View
      testID="tab-bar-background"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          borderColor,
          backgroundColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export function useBottomTabOverflow() {
  return 0;
}
