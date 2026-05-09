import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontSize, fontWeight, lineHeight } from '@/constants/tokens';
import { useFontSizeScale } from '@/hooks/useFontSizeScale';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'caption' | 'label';
};

/**
 * Walks a flat or nested style array and returns a new style object
 * with any numeric `fontSize` / `lineHeight` multiplied by `scale`.
 * Style entries from the caller win over the type defaults, so we
 * scale the final flattened style rather than each input separately.
 */
function applyFontScale(style: TextProps['style'], scale: number): TextProps['style'] {
  if (scale === 1 || !style) return style;
  const flat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
  if (!flat) return style;
  const next: Record<string, unknown> = { ...flat };
  if (typeof next.fontSize === 'number') next.fontSize = next.fontSize * scale;
  if (typeof next.lineHeight === 'number') next.lineHeight = next.lineHeight * scale;
  return next as TextProps['style'];
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const scale = useFontSizeScale();

  const composed = [
    { color },
    type === 'default' ? styles.default : undefined,
    type === 'title' ? styles.title : undefined,
    type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
    type === 'subtitle' ? styles.subtitle : undefined,
    type === 'link' ? styles.link : undefined,
    type === 'caption' ? styles.caption : undefined,
    type === 'label' ? styles.label : undefined,
    style,
  ];

  return <Text style={applyFontScale(composed, scale)} {...rest} />;
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
