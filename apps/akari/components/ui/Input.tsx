import React, { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fontSize, hexToRgba, radius, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type InputSize = 'md' | 'lg';
export type InputVariant = 'outlined' | 'filled';

type InputProps = Omit<TextInputProps, 'style'> & {
  /** Rendered to the left of the text field, inside the border. */
  prefix?: React.ReactNode;
  /** Rendered to the right of the text field, inside the border. */
  suffix?: React.ReactNode;
  /**
   * Visual density. `md` is the default form size; `lg` matches the
   * larger auth-screen inputs (taller padding, larger text, 10px radius).
   */
  size?: InputSize;
  /**
   * `outlined` (default): bordered form input over the page background.
   * `filled`: no border, themed `panel` background, pill-shaped — for
   * search bars and other "in-panel" inputs.
   */
  variant?: InputVariant;
  /** Override for the outer row container. */
  containerStyle?: StyleProp<ViewStyle>;
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
  { prefix, suffix, size = 'md', variant = 'outlined', containerStyle, inputStyle, onFocus, onBlur, ...textInputProps },
  ref,
) {
  const outlinedBorder = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const outlinedBg = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const filledBg = useThemeColor({}, 'panel');
  const textColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const placeholderColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  // Track focus on the inner TextInput so we can paint a focus ring on
  // the *outer* row — that way the highlight wraps both the prefix and
  // suffix slots, not just the typing area. RN-Web's default `<input>`
  // outline is suppressed (see `suppressWebFocusRing`).
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const isFilled = variant === 'filled';
  const focusBorderColor = semanticColors.systemBlue;
  const focusRingStyle = isFocused ? webFocusRing : null;

  // Both variants keep a 1px border always — only the colour flips on
  // focus. Toggling `borderWidth` would nudge the row 1px in each
  // direction and shift sibling layout, even though `box-shadow` (the
  // halo below) is paint-only and doesn't affect layout.
  const containerVariantStyle = isFilled
    ? {
        borderColor: isFocused ? focusBorderColor : 'transparent',
        backgroundColor: filledBg,
      }
    : {
        borderColor: isFocused ? focusBorderColor : outlinedBorder,
        backgroundColor: outlinedBg,
      };

  // Outlined puts vertical padding on the inner TextInput so the slots
  // stretch to the row height; filled puts it on the outer container so
  // the input row collapses to its font height and the prefix icon
  // centres tightly.
  const containerSizeStyle = isFilled
    ? styles.containerFilled
    : size === 'lg'
    ? styles.containerLg
    : styles.containerMd;
  const inputSizeStyle = isFilled
    ? styles.inputFilled
    : size === 'lg'
    ? styles.inputLg
    : styles.inputMd;

  const textInput = (
    <TextInput
      ref={ref}
      placeholderTextColor={textInputProps.placeholderTextColor ?? placeholderColor}
      {...textInputProps}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.input, inputSizeStyle, { color: textColor }, suppressWebFocusRing, inputStyle]}
    />
  );

  // Single render path: the TextInput always lives inside a `flex: 1`
  // wrapper so it fills the row width even when there are no slots.
  // (Without the wrapper, the slot-less branch landed the TextInput
  // directly inside a `flexDirection: row` View, which on web shrank it
  // to its intrinsic ~200px width.)
  return (
    <View
      style={[
        styles.row,
        containerSizeStyle,
        containerVariantStyle,
        focusRingStyle,
        containerStyle,
      ]}
    >
      {prefix ? <View style={styles.slot}>{prefix}</View> : null}
      <View style={styles.inputWrapper}>{textInput}</View>
      {suffix ? <View style={styles.slot}>{suffix}</View> : null}
    </View>
  );
});

// Subtle outer halo around the whole composite when focused, matching
// the Tailwind `focus:ring-2` pattern. RN-Web maps this to a CSS
// box-shadow; native renders it as the elevation prop (a soft shadow
// rather than the precise halo, but visually consistent).
const webFocusRing =
  Platform.OS === 'web'
    ? ({ boxShadow: `0 0 0 3px ${hexToRgba(semanticColors.systemBlue, 0.18)}` } as unknown as ViewStyle)
    : null;

// RN-Web maps TextInput to a real `<input>`. Suppress the browser's
// default focus outline so it doesn't paint inside our themed row;
// callers can layer their own focus affordance on the outer container.
const suppressWebFocusRing: TextInputProps['style'] =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextInputProps['style']) : undefined;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  // Vertical padding lives on the outer container for every variant so
  // the row height is uniform and `alignItems: center` actually
  // vertically centres the TextInput text with the prefix / suffix
  // icons. (Previously the inner TextInput owned its own paddingVertical
  // and the text drifted off-baseline relative to the slots.)
  containerMd: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  containerLg: {
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  containerFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  slot: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {},
  inputMd: { fontSize: fontSize.base },
  inputLg: { fontSize: fontSize.lg },
  inputFilled: { fontSize: fontSize.base },
});
