import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

type DialogModalProps = {
  children: React.ReactNode;
  isVisible?: boolean;
  onRequestClose?: () => void;
  testID?: string;
};

export function DialogModal({ children, isVisible = true, onRequestClose, testID }: DialogModalProps) {
  const { colors } = useAppTheme();
  const overlayProps = onRequestClose
    ? {
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Close modal',
        onPress: onRequestClose,
      }
    : {
        pointerEvents: 'none' as const,
      };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]} testID={testID}>
        <Pressable style={StyleSheet.absoluteFill} {...overlayProps} />
        <View style={styles.centerContainer} pointerEvents="box-none">
          <Pressable style={styles.contentWrapper} onPress={() => {}}>
            {children}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
  },
});
