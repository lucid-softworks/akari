import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Modal } from '@/components/ui/Modal';
import { ThemedView } from '@/components/ThemedView';
import { radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

const isWeb = Platform.OS === 'web';

type NativePresentation = 'centered' | 'sheet';

type DialogProps = {
  /** Called when the user dismisses via backdrop tap, system back,
   *  or the consumer's own close button. */
  onClose: () => void;
  children: React.ReactNode;

  /** Caps the card's width on wide viewports. Default 480.
   *  Recommended starting points: 420 for confirm dialogs, 480 for
   *  sheets, 640 for forms with multiple fields. */
  maxWidth?: number;
  /** Optional fixed card height (handy for forms whose body would
   *  otherwise grow/shrink as fields toggle). Default: content. */
  height?: ViewStyle['height'];
  /** Wrap children in KeyboardAvoidingView so a focused input isn't
   *  hidden behind the on-screen keyboard. Default `false`. Set when
   *  the dialog contains a `TextInput`. */
  keyboardAvoiding?: boolean;
  /** Tap-on-backdrop dismisses the dialog. Default `true`. Pass
   *  `false` for destructive flows where you want an explicit Cancel. */
  dismissOnBackdropPress?: boolean;
  /** Surface background. Defaults to the theme `panel` token —
   *  matches every other elevated surface in the app. */
  backgroundColor?: string;
  /** Native presentation style:
   *  - `'centered'` (default): centered card on every platform,
   *    with a dimmed backdrop. The dialog/alert shape.
   *  - `'sheet'`: iOS `pageSheet` / Android `fullScreen` / web
   *    centered card. Use for content that wants slide-up sheet
   *    semantics on phones (filter sheets, long lists, etc.). */
  nativePresentation?: NativePresentation;
  /** Animation. Defaults to `'fade'` for centered presentation and
   *  `'slide'` for `nativePresentation: 'sheet'`. */
  animation?: 'none' | 'slide' | 'fade';
  /** Visibility. Defaults to `true` so dialogs render whenever they
   *  are mounted (matches how `DialogContext` controls lifecycle). */
  visible?: boolean;
  /** Sibling content rendered outside the backdrop (e.g. a nested
   *  sheet portalled over the same Modal instance). */
  trailingChildren?: React.ReactNode;
  /** testID for testing libraries that need to query the backdrop. */
  testID?: string;
  /** Extra style applied to the inner card. */
  sheetStyle?: StyleProp<ViewStyle>;
};

const nativeSheetPresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
  Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

/**
 * The single dialog/modal primitive used across the app. Pair it
 * with the `DialogContext` manager (`useDialogManager().open({ id,
 * component: <Dialog onClose=… >…</Dialog> })`) so the dialog stack
 * stays centralized.
 *
 * Two shapes, driven by `nativePresentation`:
 *
 *  - **centered** (default) — backdrop + centered card on every
 *    platform. Replaces the old `DialogModal` (confirm dialogs,
 *    label details) and `CenteredModal` (form sheets with keyboards).
 *
 *  - **sheet** — web centered card / iOS `pageSheet` / Android
 *    `fullScreen`. Replaces the old `SheetModal` (filters, verifier
 *    list, akari members, account switcher, etc.). The Modal portal
 *    on web still wraps the card in a backdrop so the page behind
 *    dims and `useBodyScrollLock` engages.
 *
 * The body of the dialog (header, scroll body, footer) is the
 * consumer's responsibility — Dialog just owns the frame.
 */
export function Dialog({
  onClose,
  children,
  maxWidth = 480,
  height,
  keyboardAvoiding = false,
  dismissOnBackdropPress = true,
  backgroundColor,
  nativePresentation = 'centered',
  animation,
  visible = true,
  trailingChildren,
  testID,
  sheetStyle,
}: DialogProps) {
  const borderColor = useBorderColor();
  // Same lifted-surface tone the rest of the app uses for cards /
  // modals (PostActionsMenu, LabelDetailModal, ProfileHoverCard …).
  const themedBackground = useThemeColor({}, 'panel');
  const surfaceBackground = backgroundColor ?? themedBackground;

  const useNativeSheet = !isWeb && nativePresentation === 'sheet';
  // Android fullScreen draws under the status bar; iOS pageSheet
  // auto-insets. Mirrors the old SheetModal behaviour.
  const containerTopPadding =
    useNativeSheet && Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const resolvedAnimation = animation ?? (useNativeSheet ? 'slide' : 'fade');

  if (useNativeSheet) {
    return (
      <Modal
        visible={visible}
        animationType={resolvedAnimation}
        presentationStyle={nativeSheetPresentationStyle}
        onRequestClose={onClose}
      >
        <ThemedView
          style={[
            styles.nativeSheetSurface,
            { backgroundColor: surfaceBackground, paddingTop: containerTopPadding },
            sheetStyle,
          ]}
        >
          {children}
        </ThemedView>
        {trailingChildren}
      </Modal>
    );
  }

  const cardContent = (
    <ThemedView
      style={[
        styles.card,
        { backgroundColor: surfaceBackground, borderColor },
        height !== undefined ? { height } : null,
        sheetStyle,
      ]}
    >
      {children}
    </ThemedView>
  );

  const cardWithKeyboard = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {cardContent}
    </KeyboardAvoidingView>
  ) : (
    cardContent
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolvedAnimation}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        testID={testID}
        onPress={dismissOnBackdropPress ? onClose : undefined}
        accessibilityRole={dismissOnBackdropPress ? 'button' : undefined}
        accessibilityLabel={dismissOnBackdropPress ? 'Close dialog' : undefined}
      >
        {/* Swallow presses so taps inside the card don't bubble up
            to the backdrop and dismiss the dialog mid-interaction. */}
        <Pressable
          style={[styles.cardWrapper, { maxWidth }]}
          onPress={(event) => event.stopPropagation()}
        >
          {cardWithKeyboard}
        </Pressable>
      </Pressable>
      {trailingChildren}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Backdrop's padding is the *only* breathing room around the card —
  // there's no second cap layered on top. So short dialogs stay
  // short (sized to content) and long dialogs stretch all the way
  // out to `viewport - 2 × spacing.lg` before scrolling internally.
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cardWrapper: {
    width: '100%',
    // `maxHeight: 100%` of the padded backdrop content area = the full
    // viewport minus the backdrop's 16px top/bottom padding. We used
    // to stack a 90% cap on top of that and the modal floated short
    // even when its content could have filled more space.
    maxHeight: '100%',
    // `flexShrink: 1` lets the wrapper give way when the inner card
    // wants more than the cap; without it, RN's column flex would
    // happily blow past `maxHeight` and clip whatever it touched.
    flexShrink: 1,
  },
  card: {
    width: '100%',
    borderRadius: radius.md,
    // Explicit 1px (not `layout.hairline`): at 1× DPR a half-pixel
    // border collapses to 0 in RN-Web, leaving the modal floating
    // with no visible edge against the dimmed backdrop.
    borderWidth: 1,
    overflow: 'hidden',
    // Match the wrapper — a tall content block scrolls *inside* the
    // card instead of pushing the card past its bounds.
    flexShrink: 1,
  },
  keyboardAvoiding: {
    width: '100%',
    flexShrink: 1,
  },
  nativeSheetSurface: {
    flex: 1,
  },
});
