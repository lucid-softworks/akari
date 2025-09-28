import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function BlurTabBarBackground() {
  const borderColor = useBorderColor();
  const fallbackBackground = useThemeColor(
    { light: 'rgba(249, 250, 251, 0.88)', dark: 'rgba(15, 17, 21, 0.82)' },
    'background',
  );

  return (
    <View
      testID="tab-bar-background"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.container, { borderColor, backgroundColor: fallbackBackground }]}
    >
      <BlurView
        // System chrome material automatically adapts to the system's theme
        // and matches the native tab bar appearance on iOS.
        tint="systemChromeMaterial"
        intensity={100}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
