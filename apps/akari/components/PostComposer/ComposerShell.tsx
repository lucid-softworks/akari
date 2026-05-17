import { KeyboardAvoidingView, Modal, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';

import { styles } from './styles';

const isWeb = Platform.OS === 'web';
const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
  Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

type ComposerShellProps = {
  visible: boolean;
  onRequestClose: () => void;
  backgroundColor: string;
  children: React.ReactNode;
  trailingChildren?: React.ReactNode;
};

/**
 * Outer modal frame for PostComposer: Modal -> ThemedView (background) ->
 * KeyboardAvoidingView. The body composes header/content/footer; the
 * trailing slot is for nested sheets that live outside the KAV.
 */
export function ComposerShell({
  visible,
  onRequestClose,
  backgroundColor,
  children,
  trailingChildren,
}: ComposerShellProps) {
  const { bottom, top } = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={onRequestClose}
    >
      {/*
       * ThemedView wraps KeyboardAvoidingView so the dark background always
       * paints the full modal frame. With KAV on the outside, Android
       * `behavior='height'` would shrink the inner background and reveal the
       * Modal's default white at the bottom.
       */}
      <ThemedView
        testID="post-composer-container"
        style={[
          styles.container,
          { backgroundColor },
          isWeb && styles.webContainer,
          // `useSafeAreaInsets` returns 0 inside a Modal on Android, so use
          // `StatusBar.currentHeight` for the top padding.
          !isWeb && {
            paddingTop:
              Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : top,
            paddingBottom: bottom,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {children}
        </KeyboardAvoidingView>
      </ThemedView>
      {trailingChildren}
    </Modal>
  );
}
