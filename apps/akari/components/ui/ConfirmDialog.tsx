import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Dialog } from '@/components/ui/Dialog';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ConfirmButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type ConfirmDialogProps = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  onClose: () => void;
};

/**
 * Themed replacement for `showAlert` (which falls back to the browser's
 * native `window.confirm` on web and looks completely different from
 * the rest of the app's modal sheets). Same API shape as the alert
 * util so callers can drop it in via `useConfirm()` without rewriting
 * their button arrays.
 */
export function ConfirmDialog({ title, message, buttons, onClose }: ConfirmDialogProps) {
  const surfaceColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#2A2D2E' }, 'border');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({}, 'tint');
  const destructiveColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');

  const handlePress = useCallback(
    (button: ConfirmButton) => {
      onClose();
      button.onPress?.();
    },
    [onClose],
  );

  return (
    <Dialog
      onClose={onClose}
      maxWidth={420}
      backgroundColor={surfaceColor}
    >
      <ThemedText style={styles.title}>{title}</ThemedText>
      {message ? (
        <ThemedText style={[styles.message, { color: subduedColor }]}>{message}</ThemedText>
      ) : null}
      <View style={[styles.buttonRow, { borderTopColor: borderColor }]}>
        {buttons.map((button, index) => {
          const isLast = index === buttons.length - 1;
          const isCancel = button.style === 'cancel';
          const isDestructive = button.style === 'destructive';
          const color = isDestructive ? destructiveColor : isCancel ? subduedColor : accentColor;
          return (
            <Pressable
              key={button.text}
              accessibilityRole="button"

              onPress={() => handlePress(button)}
              style={({ pressed }) => [styles.button,
                !isLast && { borderRightColor: borderColor, borderRightWidth: layout.hairline }, pressed && { opacity: 0.7 }]}
            >
              <ThemedText style={[styles.buttonText, { color }, isCancel ? styles.cancelText : null]}>
                {button.text}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  message: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: layout.hairline,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  cancelText: {
    fontWeight: fontWeight.regular,
  },
});
