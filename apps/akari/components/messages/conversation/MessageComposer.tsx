import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { EmojiPicker } from '@/components/EmojiPicker';
import { GifPicker } from '@/components/GifPicker';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

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
 * affordances. Owns its own picker visibility state — the parent only
 * cares about the message text and the "send" action.
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
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  return (
    <>
      <ThemedView style={[styles.inputContainer, { borderTopColor: borderColor }]}>
        <Pressable
          style={({ pressed }) => [styles.inputBarAction, pressed && { opacity: 0.7 }]}
          onPress={() => setEmojiPickerVisible(true)}
          accessibilityLabel={t('post.addEmoji')}
          hitSlop={8}
        >
          <IconSymbol name="face.smiling" size={26} color={iconColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.inputBarAction, pressed && { opacity: 0.7 }]}
          onPress={() => setGifPickerVisible(true)}
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

      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={(emoji) => {
          const { start, end } = selectionRef.current;
          const safeStart = Math.min(Math.max(start, 0), value.length);
          const safeEnd = Math.min(Math.max(end, safeStart), value.length);
          const next = value.slice(0, safeStart) + emoji + value.slice(safeEnd);
          onChange(next);
          const cursor = safeStart + emoji.length;
          selectionRef.current = { start: cursor, end: cursor };
          setEmojiPickerVisible(false);
        }}
      />

      <GifPicker
        visible={gifPickerVisible}
        onClose={() => setGifPickerVisible(false)}
        onSelectGif={(gif) => {
          // Append the GIF URL to the message; ChatMediaEmbed renders it
          // inline below the bubble on receivers using this client.
          onChange(value ? `${value} ${gif.uri}` : gif.uri);
          setGifPickerVisible(false);
        }}
      />
    </>
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
