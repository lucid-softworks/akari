import React, { useState, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fontSize, hexToRgba, radius, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

type TextareaProps = Omit<TextInputProps, 'style' | 'multiline' | 'textAlignVertical'> & {
  /** Minimum content height in px. Defaults to 96. */
  minHeight?: number;
  /** Optional cap before the content scrolls inside the textarea. */
  maxHeight?: number;
  /** Override for the bordered card. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Override for the inner `TextInput`. */
  inputStyle?: TextInputProps['style'];
  /** Forwarded to the inner `TextInput`. */
  ref?: Ref<TextInput>;
};

/**
 * Multi-line text area primitive. Owns its own themed border, internal
 * padding, focus ring, and web-only focus-outline suppression. Textareas
 * don't take prefix / suffix slots — those are an `Input`-only concern.
 *
 * Defaults: `multiline`, `textAlignVertical: 'top'`, minHeight 96, a
 * subtle internal padding so the caret has room to breathe, and the
 * shared systemBlue focus halo from `Input`.
 */
export function Textarea({
  minHeight = 96,
  maxHeight,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ref,
  ...textInputProps
}: TextareaProps) {
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const textColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const placeholderColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const [isFocused, setIsFocused] = useState(false);
  const focusInput: NonNullable<TextInputProps['onFocus']> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };
  const blurInput: NonNullable<TextInputProps['onBlur']> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const focusBorderColor = semanticColors.systemBlue;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: isFocused ? focusBorderColor : borderColor,
          backgroundColor,
        },
        isFocused ? webFocusRing : null,
        containerStyle,
      ]}
    >
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        placeholderTextColor={textInputProps.placeholderTextColor ?? placeholderColor}
        {...textInputProps}
        onFocus={focusInput}
        onBlur={blurInput}
        style={[
          styles.input,
          { color: textColor, minHeight, ...(maxHeight ? { maxHeight } : {}) },
          suppressWebFocusRing,
          inputStyle,
        ]}
      />
    </View>
  );
}

const webFocusRing =
  Platform.OS === 'web'
    ? ({ boxShadow: `0 0 0 3px ${hexToRgba(semanticColors.systemBlue, 0.18)}` } as unknown as ViewStyle)
    : null;

const suppressWebFocusRing: TextInputProps['style'] =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextInputProps['style']) : undefined;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  input: {
    fontSize: fontSize.base,
    lineHeight: 22,
    // Remove the default web `<textarea>` resize affordance so users
    // can't drag the corner past our `maxHeight` cap.
    ...(Platform.OS === 'web' ? ({ resize: 'none' } as object) : {}),
  },
});
