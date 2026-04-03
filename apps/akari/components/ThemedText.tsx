import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontSize, fontWeight, lineHeight } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'caption' | 'label';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'label' ? styles.label : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.relaxed,
  },
  defaultSemiBold: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.relaxed,
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.display,
  },
  subtitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: fontSize.lg,
    color: '#0a7ea4',
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.tight,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
