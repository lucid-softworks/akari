import { View, type ViewProps } from 'react-native';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return (
    <ComponentErrorBoundary>
      <View style={[{ backgroundColor }, style]} {...otherProps} />
    </ComponentErrorBoundary>
  );
}
