import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { EmojiPicker } from '@/components/EmojiPicker';
import { GifPicker } from '@/components/GifPicker';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useDialogManager } from '@/contexts/DialogContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { AttachedImage } from '@/utils/postComposer/types';

const EMOJI_DIALOG = 'message-composer-emoji';
const GIF_DIALOG = 'message-composer-gif';

export type MessageComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
  isSending: boolean;
  borderColor: string;
};

/**
 * Composer footer for a chat thread: text input plus emoji and GIF picker
 * affordances. The pickers open through the shared DialogManager; the parent
 * only cares about the message text and the "send" action.
 */
export function MessageComposer({
  value,
  onChange,
  onSend,
  sendDisabled,
  isSending,
  borderColor,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const dialogManager = useDialogManager();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  // Pickers open through the DialogManager (rendered at the app root), so they
  // capture a snapshot at open time. Read the latest message text from a ref
  // rather than the closed-over `value` so an inserted emoji/GIF lands on what
  // the user has actually typed.
  const valueRef = useRef(value);
  valueRef.current = value;

  const closeEmojiPicker = useCallback(() => dialogManager.close(EMOJI_DIALOG), [dialogManager]);
  const closeGifPicker = useCallback(() => dialogManager.close(GIF_DIALOG), [dialogManager]);

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      const current = valueRef.current;
      const { start, end } = selectionRef.current;
      const safeStart = Math.min(Math.max(start, 0), current.length);
      const safeEnd = Math.min(Math.max(end, safeStart), current.length);
      const next = current.slice(0, safeStart) + emoji + current.slice(safeEnd);
      onChange(next);
      const cursor = safeStart + emoji.length;
      selectionRef.current = { start: cursor, end: cursor };
      closeEmojiPicker();
    },
    [onChange, closeEmojiPicker],
  );

  const handleSelectGif = useCallback(
    (gif: AttachedImage) => {
      // Append the GIF URL to the message; ChatMediaEmbed renders it inline
      // below the bubble on receivers using this client.
      const current = valueRef.current;
      onChange(current ? `${current} ${gif.uri}` : gif.uri);
      closeGifPicker();
    },
    [onChange, closeGifPicker],
  );

  const openEmojiPicker = useCallback(() => {
    dialogManager.open({
      id: EMOJI_DIALOG,
      component: <EmojiPicker visible onClose={closeEmojiPicker} onSelectEmoji={handleSelectEmoji} />,
    });
  }, [dialogManager, closeEmojiPicker, handleSelectEmoji]);

  const openGifPicker = useCallback(() => {
    dialogManager.open({
      id: GIF_DIALOG,
      component: <GifPicker visible onClose={closeGifPicker} onSelectGif={handleSelectGif} />,
    });
  }, [dialogManager, closeGifPicker, handleSelectGif]);

  return (
    <ThemedView style={[styles.inputContainer, { borderTopColor: borderColor }]}>
        <Pressable
          style={({ pressed }) => [styles.inputBarAction, pressed && { opacity: 0.7 }]}
          onPress={openEmojiPicker}
          accessibilityLabel={t('post.addEmoji')}
          hitSlop={8}
        >
          <IconSymbol name="face.smiling" size={26} color={iconColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.inputBarAction, pressed && { opacity: 0.7 }]}
          onPress={openGifPicker}
          accessibilityLabel={t('gif.addGif')}
          hitSlop={8}
        >
          <IconSymbol name="photo.on.rectangle.angled" size={24} color={iconColor} />
        </Pressable>
        <TextInput
          style={[styles.textInput, { backgroundColor, borderColor, color: textColor }]}
          value={value}
          onChangeText={onChange}
          onSelectionChange={(e) => {
            selectionRef.current = e.nativeEvent.selection;
          }}
          placeholder={t('messages.typeMessage')}
          placeholderTextColor={iconColor}
          multiline
          maxLength={500}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            sendDisabled || isSending ? styles.sendButtonDisabled : null,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onSend}
          disabled={sendDisabled || isSending}
        >
          <IconSymbol
            name={isSending ? 'clock' : 'arrow.up.circle.fill'}
            size={32}
            color={!sendDisabled && !isSending ? '#007AFF' : '#C7C7CC'}
          />
        </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: layout.hairline,
    gap: spacing.xs,
  },
  inputBarAction: {
    paddingBottom: spacing.xs,
  },
  textInput: {
    flex: 1,
    borderWidth: layout.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: fontSize.lg,
  },
  sendButton: {
    padding: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: opacity.tertiary,
  },
});
