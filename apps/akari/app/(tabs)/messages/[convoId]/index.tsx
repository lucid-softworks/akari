import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQueryClient } from '@tanstack/react-query';
import type { BlueskyEmbed } from '@/bluesky-api';
import { EmojiPicker } from '@/components/EmojiPicker';
import { MessageBubble } from '@/components/messages/conversation/MessageBubble';
import { MessageComposer } from '@/components/messages/conversation/MessageComposer';
import { ReactionsDialog } from '@/components/chat/ReactionsDialog';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, spacing } from '@/constants/tokens';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useMessageReaction } from '@/hooks/mutations/useMessageReaction';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useConvo } from '@/hooks/queries/useConvo';
import { useConversations } from '@/hooks/queries/useConversations';
import { useMessages } from '@/hooks/queries/useMessages';
import { queryKeys } from '@/hooks/queryKeys';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';

type Reaction = {
  value: string;
  sender: { did: string };
  createdAt: string;
};

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  senderDid: string;
  sentAt: string;
  embed?: BlueskyEmbed;
  reactions: Reaction[];
};

type MessageError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

export default function ConversationScreen() {
  // The path segment is the convoId. For backward compat with legacy
  // links (push notifications dispatched before the rename, anything
  // pasted from older history), accept either a convoId or a handle here.
  // Handles always contain a dot; convoIds don't — that's enough to
  // disambiguate.
  const params = useLocalSearchParams<{ convoId: string; handle?: string }>();
  const rawParam = decodeURIComponent(params.convoId ?? '');
  const looksLikeHandle = rawParam.includes('.');
  const handle = looksLikeHandle ? rawParam : (params.handle ?? '');
  const convoIdParam = looksLikeHandle ? undefined : rawParam;
  const [messageText, setMessageText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const incomingMessageBackground = useThemeColor({ light: '#E9EAEC', dark: '#2c2c2e' }, 'background');
  const outgoingMessageBackground = useThemeColor({ light: '#7C8CF9', dark: '#5A67D8' }, 'tint');

  // Get the conversation ID from the conversations list. Prefer the
  // `convoId` query param when set — handle alone isn't unique (e.g.
  // every deleted account collapses to `missing.invalid`), so
  // routing-by-handle would silently collide.
  const { data: conversationsData } = useConversations();
  const allConversations = conversationsData?.pages.flatMap((page) => page.conversations) ?? [];
  const conversationFromList =
    (convoIdParam && allConversations.find((conv) => conv.convoId === convoIdParam)) ||
    (handle ? allConversations.find((conv) => conv.handle === handle) : undefined);
  // Fallback: a freshly-created convo may not appear in `listConvos`
  // until it has at least one message. Fetch it directly when the list
  // lookup misses.
  const { data: conversationDirect } = useConvo(
    !conversationFromList && convoIdParam ? convoIdParam : null,
  );
  const conversation = conversationFromList ?? conversationDirect;

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversation?.convoId, 50);

  const sendMessageMutation = useSendMessage();
  const reactionMutation = useMessageReaction();
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [reactionsDialogFor, setReactionsDialogFor] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  // Flatten all pages of messages into a single array. API returns
  // newest-first — keep order for an inverted FlatList.
  const messages: Message[] = messagesData?.pages.flatMap((page) => page.messages) || [];

  const handleToggleReaction = (messageId: string, value: string) => {
    if (!conversation?.convoId || !currentAccount?.did) return;
    const message = messages.find((m) => m.id === messageId);
    const alreadyReacted = message?.reactions.some(
      (r) => r.value === value && r.sender.did === currentAccount.did,
    );
    reactionMutation.mutate({
      convoId: conversation.convoId,
      messageId,
      value,
      action: alreadyReacted ? 'remove' : 'add',
    });
    setReactionPickerFor(null);
  };

  const handleLongPressMessage = (messageId: string) => {
    setReactionPickerFor((current) => (current === messageId ? null : messageId));
  };

  // Mark conversation as read when opened
  useEffect(() => {
    if (!conversation?.convoId || !token || !currentAccount?.pdsUrl) return;
    const api = apiForAccount(currentAccount);
    void api.markConversationRead(token, conversation.convoId).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      return undefined;
    });
  }, [conversation?.convoId, token, currentAccount, queryClient]);

  const handleMessageImageLoad = (imageUrl: string, width: number, height: number) => {
    if (width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)) {
      setImageDimensions((prev) => ({
        ...prev,
        [imageUrl]: { width, height },
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation?.convoId) return;
    try {
      await sendMessageMutation.mutateAsync({
        convoId: conversation.convoId,
        text: messageText.trim(),
      });
      setMessageText('');
    } catch {
      confirm({
        title: t('common.error'),
        message: t('messages.errorSendingMessage'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // In group chats, show the sender's display name above each incoming
    // message so you know who said what. Suppressed for 1:1 chats and
    // your own messages.
    const senderLabel =
      conversation?.isGroup && !item.isFromMe
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
        if (r.sender.did === currentAccount?.did) existing.mine = true;
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
        incomingBackground={incomingMessageBackground}
        outgoingBackground={outgoingMessageBackground}
        borderColor={borderColor}
        onImageLoad={handleMessageImageLoad}
        onLongPress={() => handleLongPressMessage(item.id)}
        onToggleReaction={(value) => handleToggleReaction(item.id, value)}
        onOpenEmojiPicker={() => {
          setReactionPickerFor(null);
          setEmojiPickerFor(item.id);
        }}
        onShowReactionsDialog={() => setReactionsDialogFor(item.id)}
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

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const webBorders = Platform.OS === 'web' ? webColumnSideBorders(borderColor) : null;

  // Show loading state while finding conversation
  if (!conversation) {
    return (
      <ThemedView style={[styles.container, webBorders]}>
        <ThemedView style={styles.loadingState}>
          <ThemedText style={styles.loadingText}>
            {t('common.loading')} {t('common.conversations')}...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Show error state
  if (messagesError) {
    const messageError = messagesError as MessageError;
    return (
      <ThemedView style={[styles.container, webBorders]}>
        <ThemedView style={styles.errorState}>
          <ThemedText style={styles.errorText}>{messageError.message}</ThemedText>
          {messageError.type === 'permission' && (
            <ThemedText style={styles.errorSubtext}>{t('common.errorLoadingMessages')}</ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }, webBorders]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56 + 60}
    >
      {/* Header is rendered by the (tabs) layout's mobileDrawerHeader so
          the chat thread looks consistent with the rest of the app. */}
      {messagesLoading ? (
        <View style={styles.loadingState}>
          <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          inverted
          keyboardDismissMode="interactive"
        />
      )}

      <MessageComposer
        value={messageText}
        onChange={setMessageText}
        onSend={handleSendMessage}
        sendDisabled={!messageText.trim()}
        isSending={sendMessageMutation.isPending}
        borderColor={borderColor}
      />

      <ReactionsDialog
        visible={!!reactionsDialogFor}
        reactions={messages.find((m) => m.id === reactionsDialogFor)?.reactions ?? []}
        reactors={[
          ...(currentAccount
            ? [{
                did: currentAccount.did,
                handle: currentAccount.handle,
                displayName: currentAccount.displayName,
                avatar: currentAccount.avatar,
              }]
            : []),
          ...(conversation?.members ?? []),
        ]}
        onDismiss={() => setReactionsDialogFor(null)}
      />

      <EmojiPicker
        visible={!!emojiPickerFor}
        onClose={() => setEmojiPickerFor(null)}
        onSelectEmoji={(emoji) => {
          if (emojiPickerFor) {
            handleToggleReaction(emojiPickerFor, emoji);
          }
          setEmojiPickerFor(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.lg,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
});
