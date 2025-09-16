import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type PanelProps = {
  visible: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  onRequestClose?: () => void;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  testID?: string;
};

export function Panel({
  visible,
  title,
  children,
  onRequestClose,
  headerActions,
  footerActions,
  testID,
}: PanelProps) {
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#0F1115' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const headerBackground = useThemeColor({ light: '#F9FAFB', dark: '#151823' }, 'background');
  const titleColor = useThemeColor({ light: '#111827', dark: '#F4F4F5' }, 'text');

  const handleOverlayPress = () => {
    if (onRequestClose) {
      onRequestClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onRequestClose ? handleOverlayPress : undefined}
        testID={testID}
      >
        <Pressable style={styles.panelWrapper} onPress={() => {}}>
          <View
            style={[
              styles.panel,
              {
                backgroundColor,
                borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.header,
                {
                  backgroundColor: headerBackground,
                  borderColor,
                },
              ]}
            >
              <ThemedText style={[styles.title, { color: titleColor }]}>{title}</ThemedText>
              {headerActions ? <View style={styles.headerActions}>{headerActions}</View> : null}
            </View>

            <View style={styles.body}>{children}</View>

            {footerActions ? (
              <View
                style={[
                  styles.footer,
                  {
                    borderColor,
                  },
                ]}
              >
                {footerActions}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panelWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  panel: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});
