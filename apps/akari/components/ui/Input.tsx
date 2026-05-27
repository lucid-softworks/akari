import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

type InputProps = Omit<TextInputProps, 'style'> & {
  /** Rendered to the left of the text field, inside the border. */
  prefix?: React.ReactNode;
  /** Rendered to the right of the text field, inside the border. */
  suffix?: React.ReactNode;
  /** Override for the outer row container. */
  containerStyle?: ViewStyle;
  /** Override for the inner `TextInput` element. */
  inputStyle?: TextInputProps['style'];
};

/**
 * Themed text input with optional prefix / suffix slots. All chrome
 * (border, background, padding, web focus-ring suppression) lives here
 * so callers just pass the slot content (e.g. a static suffix label or
 * a tappable Menu trigger). When either slot is present we render a
 * single-row composite; when neither is, the input renders bare and
 * paints its own border.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { prefix, suffix, containerStyle, inputStyle, ...textInputProps },
  ref,
) {
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const textColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const placeholderColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const textInput = (
    <TextInput
      ref={ref}
      placeholderTextColor={textInputProps.placeholderTextColor ?? placeholderColor}
      {...textInputProps}
      style={[styles.input, { color: textColor }, suppressWebFocusRing, inputStyle]}
    />
  );

  if (!prefix && !suffix) {
    return (
      <View style={[styles.standalone, { borderColor, backgroundColor }, containerStyle]}>
        {textInput}
      </View>
    );
  }

  return (
    <View style={[styles.composite, { borderColor, backgroundColor }, containerStyle]}>
      {prefix ? <View style={styles.slot}>{prefix}</View> : null}
      <View style={styles.inputWrapper}>{textInput}</View>
      {suffix ? <View style={styles.slot}>{suffix}</View> : null}
    </View>
  );
});

// RN-Web maps TextInput to a real `<input>`. Suppress the browser's
// default focus outline so it doesn't paint inside our themed row;
// callers can layer their own focus affordance on the outer container.
const suppressWebFocusRing: TextInputProps['style'] =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextInputProps['style']) : undefined;

const styles = StyleSheet.create({
  standalone: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  composite: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  slot: {
    flexShrink: 0,
  },
  input: {
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
  },
});
