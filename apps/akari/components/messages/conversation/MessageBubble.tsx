import { Platform, Pressable, StyleSheet, View } from 'react-native';

import type { BlueskyEmbed } from '@/bluesky-api';
import { ChatMediaEmbed, extractChatMedia, stripChatMediaText } from '@/components/chat/ChatMediaEmbed';
import { MessageEmbed } from '@/components/messages/conversation/MessageEmbed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export type ReactionGroup = { count: number; mine: boolean };

export type MessageBubbleProps = {
  messageId: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  senderLabel: string | null;
  embed: BlueskyEmbed | undefined;
  reactionGroups: Map<string, ReactionGroup>;
  showPicker: boolean;
  imageDimensions: Record<string, { width: number; height: number }>;
  textColor: string;
  iconColor: string;
  incomingBackground: string;
  outgoingBackground: string;
  borderColor: string;
  onImageLoad: (imageUrl: string, width: number, height: number) => void;
  onLongPress: () => void;
  onToggleReaction: (value: string) => void;
  onOpenEmojiPicker: () => void;
  onShowReactionsDialog: () => void;
};

export function MessageBubble({
  messageId,
  text,
  timestamp,
  isFromMe,
  senderLabel,
  embed,
  reactionGroups,
  showPicker,
  imageDimensions,
  textColor,
  iconColor,
  incomingBackground,
  outgoingBackground,
  borderColor,
  onImageLoad,
  onLongPress,
  onToggleReaction,
  onOpenEmojiPicker,
  onShowReactionsDialog,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const inlineMedia = extractChatMedia(text);
  const displayText = inlineMedia ? stripChatMediaText(text, inlineMedia.matchedText) : text;
  const hasText = displayText.trim().length > 0;
  const embedContent = embed ? (
    <MessageEmbed
      embed={embed}
      messageId={messageId}
      imageDimensions={imageDimensions}
      onImageLoad={onImageLoad}
    />
  ) : null;

  return (
    <ThemedView style={[styles.messageContainer, isFromMe ? styles.myMessage : styles.theirMessage]}>
      {senderLabel ? (
        <ThemedText style={[styles.senderLabel, { color: iconColor }]} numberOfLines={1}>
          {senderLabel}
        </ThemedText>
      ) : null}

      {showPicker ? (
        <View
          style={[
            styles.reactionPicker,
            isFromMe ? styles.reactionPickerMine : styles.reactionPickerTheirs,
            { backgroundColor: incomingBackground },
          ]}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(emoji)}
              hitSlop={6}
              style={({ pressed }) => [styles.reactionPickerSlot, pressed && { opacity: 0.7 }]}
            >
              <ThemedText style={styles.reactionPickerEmoji}>{emoji}</ThemedText>
            </Pressable>
          ))}
          <Pressable
            onPress={onOpenEmojiPicker}
            hitSlop={6}
            style={({ pressed }) => [styles.reactionPickerSlot, pressed && { opacity: 0.7 }]}
            accessibilityLabel={t('messages.moreEmoji')}
          >
            <IconSymbol name="plus.circle" size={24} color={iconColor} />
          </Pressable>
        </View>
      ) : null}

      {(hasText || inlineMedia || !embed) && (
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={250}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <ThemedView
            style={[
              styles.messageBubble,
              isFromMe ? styles.myBubble : styles.theirBubble,
              inlineMedia ? styles.messageBubbleMedia : null,
              { backgroundColor: isFromMe ? outgoingBackground : incomingBackground },
            ]}
          >
            {hasText ? (
              <ThemedText
                style={[
                  styles.messageText,
                  { color: isFromMe ? '#fff' : textColor },
                  inlineMedia ? styles.messageTextWithMedia : null,
                ]}
              >
                {displayText}
              </ThemedText>
            ) : null}
            {inlineMedia ? (
              <ChatMediaEmbed media={inlineMedia} alignment={isFromMe ? 'right' : 'left'} />
            ) : null}
          </ThemedView>
        </Pressable>
      )}

      {embed ? (
        <ThemedView style={[styles.embedContainer, isFromMe ? styles.myEmbed : styles.theirEmbed]}>
          {embedContent ?? (
            <ThemedText style={[styles.unsupportedEmbedText, { color: iconColor }]}>
              {t('common.unknown')}
            </ThemedText>
          )}
        </ThemedView>
      ) : null}

      {reactionGroups.size > 0 ? (
        <View
          style={[
            styles.reactionsRow,
            isFromMe ? styles.reactionsRowMine : styles.reactionsRowTheirs,
          ]}
        >
          {Array.from(reactionGroups.entries()).map(([emoji, { count, mine }]) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(emoji)}
              onLongPress={onShowReactionsDialog}
              delayLongPress={250}
              style={({ pressed }) => [
                styles.reactionChip,
                { borderColor },
                mine && { backgroundColor: incomingBackground, borderColor: outgoingBackground },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={styles.reactionChipEmoji}>{emoji}</ThemedText>
              {count > 1 ? (
                <ThemedText style={[styles.reactionChipCount, { color: iconColor }]}>
                  {count}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <ThemedText
        style={[
          styles.messageTimestamp,
          isFromMe ? styles.timestampOutgoing : styles.timestampIncoming,
          { color: iconColor },
        ]}
      >
        {timestamp}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  senderLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  messageContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    // RN-Web's CSS pipeline can't always resolve a % maxWidth here — pin
    // the web cap to a comfortable chat-line dp; native keeps the
    // original percentage behaviour.
    maxWidth: Platform.OS === 'web' ? 520 : '80%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  messageBubbleMedia: {
    padding: spacing.xs,
  },
  myBubble: {},
  theirBubble: {},
  messageText: {
    fontSize: fontSize.lg,
  },
  messageTextWithMedia: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  messageTimestamp: {
    fontSize: fontSize.xs,
    opacity: opacity.tertiary,
    marginTop: spacing.xxs,
  },
  timestampOutgoing: {
    alignSelf: 'flex-end',
  },
  timestampIncoming: {
    alignSelf: 'flex-start',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: -spacing.xxs,
  },
  reactionsRowMine: {
    alignSelf: 'flex-end',
  },
  reactionsRowTheirs: {
    alignSelf: 'flex-start',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: layout.hairline,
  },
  reactionChipEmoji: {
    fontSize: fontSize.sm,
  },
  reactionChipCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  reactionPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    marginBottom: spacing.xxs,
  },
  reactionPickerMine: {
    alignSelf: 'flex-end',
  },
  reactionPickerTheirs: {
    alignSelf: 'flex-start',
  },
  reactionPickerSlot: {
    paddingHorizontal: 2,
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },
  embedContainer: {
    maxWidth: '80%',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  myEmbed: {
    alignSelf: 'flex-end',
  },
  theirEmbed: {
    alignSelf: 'flex-start',
  },
  unsupportedEmbedText: {
    fontSize: fontSize.base,
    opacity: 0.8,
  },
});
