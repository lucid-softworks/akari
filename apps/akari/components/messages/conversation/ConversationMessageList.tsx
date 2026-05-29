import type { Ref } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { MessageBubble } from '@/components/messages/conversation/MessageBubble';
import type { Conversation, Message } from '@/components/messages/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type ImageDimensions = Record<string, { width: number; height: number }>;

type ConversationMessageListProps = {
  messages: Message[];
  conversation: Conversation;
  currentUserDid: string | undefined;
  reactionPickerFor: string | null;
  imageDimensions: ImageDimensions;
  textColor: string;
  iconColor: string;
  incomingBackground: string;
  outgoingBackground: string;
  borderColor: string;
  isFetchingNextPage: boolean;
  onImageLoad: (imageUrl: string, width: number, height: number) => void;
  onLongPressMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, value: string) => void;
  onOpenEmojiPicker: (messageId: string) => void;
  onShowReactionsDialog: (messageId: string) => void;
  onLoadMore: () => void;
  ref?: Ref<FlatList<Message>>;
};

export function ConversationMessageList({
  messages,
  conversation,
  currentUserDid,
  reactionPickerFor,
  imageDimensions,
  textColor,
  iconColor,
  incomingBackground,
  outgoingBackground,
  borderColor,
  isFetchingNextPage,
  onImageLoad,
  onLongPressMessage,
  onToggleReaction,
  onOpenEmojiPicker,
  onShowReactionsDialog,
  onLoadMore,
  ref,
}: ConversationMessageListProps) {
  const { t } = useTranslation();

    const renderMessage = ({ item }: { item: Message }) => {
      // In group chats, show the sender's display name above each incoming
      // message so you know who said what. Suppressed for 1:1 chats and
      // your own messages.
      const senderLabel =
        conversation.isGroup && !item.isFromMe
          ? conversation.members.find((m) => m.did === item.senderDid)?.displayName ??
            conversation.members.find((m) => m.did === item.senderDid)?.handle ?? null
          : null;

      // Group reactions by emoji for compact display under the bubble.
      // Defensive ?? [] in case the message arrived from a cache path that
      // didn't initialise the field (e.g. optimistic send before transform).
      const reactionGroups = (item.reactions ?? []).reduce<
        Map<string, { count: number; mine: boolean }>
      >(
        (acc, r) => {
          const existing = acc.get(r.value) ?? { count: 0, mine: false };
          existing.count += 1;
          if (r.sender.did === currentUserDid) existing.mine = true;
          acc.set(r.value, existing);
          return acc;
        },
        new Map(),
      );

      return (
        <MessageBubble
          messageId={item.id}
          text={item.text}
          timestamp={item.timestamp}
          isFromMe={item.isFromMe}
          senderLabel={senderLabel}
          embed={item.embed}
          reactionGroups={reactionGroups}
          showPicker={reactionPickerFor === item.id}
          imageDimensions={imageDimensions}
          textColor={textColor}
          iconColor={iconColor}
          incomingBackground={incomingBackground}
          outgoingBackground={outgoingBackground}
          borderColor={borderColor}
          onImageLoad={onImageLoad}
          onLongPress={() => onLongPressMessage(item.id)}
          onToggleReaction={(value) => onToggleReaction(item.id, value)}
          onOpenEmojiPicker={() => onOpenEmojiPicker(item.id)}
          onShowReactionsDialog={() => onShowReactionsDialog(item.id)}
        />
      );
    };

    const renderFooter = () => {
      if (!isFetchingNextPage) return null;
      return (
        <ThemedView style={styles.loadingFooter}>
          <ThemedText style={styles.loadingText}>
            {t('common.loading')} {t('common.messages')}...
          </ThemedText>
        </ThemedView>
      );
    };

    return (
      <FlatList
        ref={ref}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={renderFooter}
        inverted
        keyboardDismissMode="interactive"
      />
    );
}

const styles = StyleSheet.create({
  messagesContent: {
    paddingVertical: spacing.lg,
  },
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
  },
});
