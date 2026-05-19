import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

type CenteredModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Caps the dialog's width on wide viewports (defaults to 640). */
  maxWidth?: number;
  /**
   * Forces a fixed proportion of viewport height instead of letting
   * the content drive height. Useful when the form is busy enough
   * that you want the height stable regardless of which fields are
   * showing.
   */
  height?: ViewStyle['height'];
  /** Optional extra style for the inner sheet (e.g. padding overrides). */
  sheetStyle?: StyleProp<ViewStyle>;
  /**
   * `none` (default) renders the backdrop instantly without sliding
   * the contents in. `slide` and `fade` map to React Native's Modal
   * animationType for consumers that want one.
   */
  animation?: 'none' | 'slide' | 'fade';
  /**
   * When false, taps on the backdrop don't dismiss. Useful for
   * destructive flows where you'd rather force an explicit Cancel.
   */
  dismissOnBackdropPress?: boolean;
};

/**
 * Generic centered modal dialog. Owns the backdrop (single source of
 * truth for the dim layer + outside-click-to-dismiss), the keyboard
 * avoiding view, the centered sizing, and the rounded-card framing.
 * Consumers just pass children for the dialog contents.
 *
 * Why this exists: every modal sheet in the app used to duplicate the
 * backdrop / KeyboardAvoidingView / "stop press from propagating to
 * the dismiss handler" wiring. Centralising it here keeps individual
 * sheets focused on their form fields and ensures dismissal works
 * consistently across surfaces.
 */
export function CenteredModal({
  visible,
  onClose,
  children,
  maxWidth = 640,
  height,
  sheetStyle,
  animation = 'none',
  dismissOnBackdropPress = true,
}: CenteredModalProps) {
  const borderColor = useBorderColor();
  const bg = useThemeColor({}, 'background');
  return (
    <Modal
      visible={visible}
      animationType={animation}
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={dismissOnBackdropPress ? onClose : undefined}
        accessibilityLabel="Close"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.kav, { maxWidth }]}
        >
          {/* Swallow the press so taps inside the dialog don't bubble
              to the backdrop's onClose handler. */}
          <StopPress>
            <ThemedView
              style={[
                styles.sheet,
                { backgroundColor: bg, borderColor },
                height !== undefined ? { height } : null,
                sheetStyle,
              ]}
            >
              {children}
            </ThemedView>
          </StopPress>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/**
 * Tiny helper: a Pressable that intercepts the press without doing
 * anything with it, so child taps don't propagate up to a wrapping
 * Pressable's `onPress`. Using a View with `onStartShouldSetResponder`
 * would also work, but Pressable's behaviour is more predictable
 * across RN and RN-Web.
 */
function StopPress({ children, style, ...rest }: PressableProps & { children: React.ReactNode }) {
  return (
    <Pressable onPress={() => undefined} style={style} {...rest}>
      {/* `onPress={() => undefined}` is intentional — without an
          onPress prop Pressable doesn't capture the gesture. */}
      <View>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  kav: {
    width: '100%',
    flexShrink: 1,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
