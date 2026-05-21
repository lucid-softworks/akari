import React from 'react';
import { Modal, Platform, Pressable, StatusBar, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

const isWeb = Platform.OS === 'web';
const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
  Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

type SheetModalProps = {
  /** Visibility — defaults to `true` so the sheet opens when mounted
   *  (matches how `DialogContext` callers render conditionally). */
  visible?: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** Cap on web card width. Defaults to 480 to match VerifiersSheet. */
  webMaxWidth?: number;
  /** Override the surface background. Defaults to the theme background. */
  backgroundColor?: string;
  /**
   * Content rendered as a sibling of the surface (outside the backdrop /
   * card). Useful when the consumer wants to portal a secondary sheet
   * over the same Modal instance.
   */
  trailingChildren?: React.ReactNode;
};

/**
 * Cross-platform modal frame shared by the app's "sheet"-style dialogs
 * (VerifiersSheet, FeedFiltersSheet, future sheets). Encapsulates the
 * platform-shape differences:
 *
 *  - **Web**: transparent RN Modal with a dimmed backdrop and a
 *    centred, bordered card. Backdrop tap dismisses; presses inside
 *    the card swallow their event so the modal doesn't close mid-
 *    interaction. The border lives here so every consumer renders the
 *    same visible frame around its contents — a `hairline` border was
 *    invisible at common DPRs, hence the explicit `1px`.
 *
 *  - **Native**: opaque RN Modal with the platform-appropriate
 *    `presentationStyle` (pageSheet on iOS, fullScreen on Android).
 *    Android additionally needs explicit top-safe-area padding because
 *    fullScreen draws under the status bar.
 *
 * The primitive intentionally only owns the outer chrome; consumers
 * compose their own header / scroll body inside `children`.
 */
export function SheetModal({
  visible = true,
  onRequestClose,
  children,
  webMaxWidth = 480,
  backgroundColor,
  trailingChildren,
}: SheetModalProps) {
  const borderColor = useBorderColor();
  // Read from the `panel` palette token rather than `background`: this
  // is the same lifted-surface tone other modals/cards in the app
  // (LabelDetailModal, ProfileHoverCard, RightColumn cards, etc.) use,
  // so the SheetModal card reads as elevated above the underlying page
  // instead of merging with it. The prior `background` lookup produced
  // a card the same colour as everything around it, which felt wrong
  // even though the border was visible.
  const themedBackground = useThemeColor({}, 'panel');
  const surfaceBackground = backgroundColor ?? themedBackground;

  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  const surface = (
    <ThemedView
      style={[
        isWeb ? styles.webCard : styles.nativeContainer,
        { backgroundColor: surfaceBackground },
        isWeb && { borderColor },
        !isWeb && { paddingTop: containerTopPadding },
      ]}
    >
      {children}
    </ThemedView>
  );

  if (isWeb) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
        <Pressable style={styles.webBackdrop} onPress={onRequestClose}>
          <Pressable
            style={[styles.webCardWrapper, { maxWidth: webMaxWidth }]}
            // Swallow presses inside the card so they don't bubble to
            // the backdrop and dismiss the modal mid-interaction.
            onPress={(event) => event.stopPropagation()}
          >
            {surface}
          </Pressable>
        </Pressable>
        {trailingChildren}
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      onRequestClose={onRequestClose}
    >
      {surface}
      {trailingChildren}
    </Modal>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
  },
  webBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  webCardWrapper: {
    width: '100%',
    maxHeight: '90%',
  },
  webCard: {
    width: '100%',
    borderRadius: radius.md,
    // Explicit 1px (not `layout.hairline`): at 1× DPR a half-pixel
    // border collapses to 0 in RN-Web, leaving the modal floating with
    // no visible edge against the dimmed backdrop.
    borderWidth: 1,
    overflow: 'hidden',
  },
});
