import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

type DialogModalProps = {
  children: React.ReactNode;
  isVisible?: boolean;
  onRequestClose?: () => void;
  testID?: string;
};

export function DialogModal({ children, isVisible = true, onRequestClose, testID }: DialogModalProps) {
  // The backdrop is the *parent* of the centered content so that clicks
  // on dialog buttons reach their own Pressables first. An earlier
  // version had the backdrop as an absoluteFill sibling of the content,
  // which on web ended up on top in CSS stacking order — every click,
  // including the buttons inside the dialog, hit the backdrop and fired
  // onRequestClose without ever invoking the button's onPress.
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        testID={testID}
        onPress={onRequestClose}
        accessibilityLabel={onRequestClose ? 'Close modal' : undefined}
      >
        {/* Swallow the press so taps inside the dialog don't bubble to
            the backdrop's onPress handler. */}
        <Pressable style={styles.contentWrapper} onPress={() => undefined}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
  },
});
