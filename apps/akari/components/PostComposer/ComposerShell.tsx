import { KeyboardAvoidingView, Modal, Platform, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';

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
  const borderColor = useBorderColor();

  const composerSurface = (
    <ThemedView
      testID="post-composer-container"
      style={[
        styles.container,
        { backgroundColor },
        isWeb && [styles.webContainer, { borderColor }],
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
  );

  return (
    <Modal
      visible={visible}
      // Sliding up from the bottom reads as mobile-y on a desktop browser;
      // fade matches the centred-modal pattern most web apps use. Native
      // platforms keep the slide because it's the platform-native animation
      // for pageSheet / fullScreen presentation styles.
      animationType={isWeb ? 'fade' : 'slide'}
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={onRequestClose}
    >
      {isWeb ? (
        // Web modals are transparent, so we paint our own scrim and let
        // backdrop clicks dismiss the composer. The inner Pressable absorbs
        // clicks on the composer surface itself so they don't bubble up to
        // the backdrop and close the composer mid-edit. Wrapper carries the
        // sizing (maxWidth/maxHeight) so the inner ThemedView's `flex: 1`
        // has a real frame to fill — otherwise the surface collapses to
        // content size.
        <Pressable style={styles.webBackdrop} onPress={onRequestClose}>
          <Pressable
            style={styles.webComposerWrapper}
            onPress={() => undefined}
          >
            {composerSurface}
          </Pressable>
        </Pressable>
      ) : (
        composerSurface
      )}
      {trailingChildren}
    </Modal>
  );
}
