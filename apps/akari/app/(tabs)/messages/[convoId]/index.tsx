import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQueryClient } from '@tanstack/react-query';
import type { BlueskyEmbed } from '@/bluesky-api';
import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { EmojiPicker } from '@/components/EmojiPicker';
import { MessageBubble } from '@/components/messages/conversation/MessageBubble';
import { MessageComposer } from '@/components/messages/conversation/MessageComposer';
import { ChatActionsSheet } from '@/components/chat/ChatActionsSheet';
import { ReactionsDialog } from '@/components/chat/ReactionsDialog';
import { ReportSheet } from '@/components/ReportSheet';
import { VerificationBadge } from '@/components/VerificationBadge';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
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
import { useResponsive } from '@/hooks/useResponsive';
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
  const { isLargeScreen } = useResponsive();

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
  // The (tabs) layout already hosts a ChatActionsSheet wired to the
  // mobile header's options button. On web large-screen there's no
  // mobile chrome, so the sticky chat header rendered below owns its
  // own copy of the sheet (and the nested ReportSheet) — both are
  // gated to `showWebThreadHeader` to avoid double-mounting on
  // viewports where the mobile chrome is already in play.
  const [chatActionsSheetVisible, setChatActionsSheetVisible] = useState(false);
  const [chatReportSheetVisible, setChatReportSheetVisible] = useState(false);

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

  // Web large-screen has no chrome above the chat thread — the
  // `(tabs)` layout's mobile header only renders at narrow widths, so
  // a desktop visitor lands inside a wall of messages with no
  // indication of *who* the chat is with. Native and mobile-web are
  // already covered by `MobileTabHeader`; this sticky header fills the
  // large-screen gap. `position: sticky; top: 0` keeps it pinned as
  // the chat scrolls.
  const showWebThreadHeader = Platform.OS === 'web' && isLargeScreen;
  const threadHeaderTitle = conversation?.isGroup
    ? (conversation?.members ?? [])
        .map((m) => m.displayName || m.handle)
        .join(', ')
    : conversation?.displayName || conversation?.handle || '';
  const threadHeaderHandle = conversation && !conversation.isGroup ? conversation.handle : null;
  const threadHeaderAvatar = conversation?.avatar;

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
      {/* Mobile / native header is rendered by the (tabs) layout's
          MobileTabHeader (with avatar + name pulled from
          messageThreadConvo). The header below covers the web
          large-screen case the mobile chrome doesn't reach. */}
      {showWebThreadHeader ? (
        <View
          style={[
            styles.webThreadHeader,
            {
              backgroundColor,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <AvatarOrInitial
            uri={threadHeaderAvatar}
            seed={threadHeaderTitle || threadHeaderHandle || '?'}
            size={32}
          />
          <View style={styles.webThreadHeaderText}>
            <View style={styles.webThreadHeaderTitleRow}>
              <ThemedText
                style={[styles.webThreadHeaderTitle, { color: textColor }]}
                numberOfLines={1}
              >
                {threadHeaderTitle}
              </ThemedText>
              {!conversation?.isGroup && conversation?.members[0]?.did ? (
                <VerificationBadge
                  subjectDid={conversation.members[0].did}
                  verification={conversation.verification}
                  subjectHandle={conversation.handle}
                  subjectDisplayName={conversation.displayName}
                  size={fontSize.base}
                />
              ) : null}
            </View>
            {threadHeaderHandle ? (
              <ThemedText
                style={[styles.webThreadHeaderHandle, { color: textColor }]}
                numberOfLines={1}
              >
                @{threadHeaderHandle}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('navigation.settings')}
            onPress={() => setChatActionsSheetVisible(true)}
            disabled={!conversation}
            style={({ pressed }) => [
              styles.webThreadHeaderButton,
              pressed && { opacity: activeOpacity.default },
            ]}
          >
            <IconSymbol name="ellipsis" color={iconColor} size={20} />
          </Pressable>
        </View>
      ) : null}

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

      {showWebThreadHeader && conversation ? (
        <>
          <ChatActionsSheet
            visible={chatActionsSheetVisible}
            onDismiss={() => setChatActionsSheetVisible(false)}
            convoId={conversation.convoId}
            isMuted={conversation.muted}
            isGroup={conversation.isGroup}
            peerDid={conversation.isGroup ? undefined : conversation.members[0]?.did}
            onReportPress={() => setChatReportSheetVisible(true)}
            onLeft={() => router.back()}
          />
          {!conversation.isGroup && conversation.members[0]?.did ? (
            <ReportSheet
              visible={chatReportSheetVisible}
              onDismiss={() => setChatReportSheetVisible(false)}
              subject={{ type: 'account', did: conversation.members[0].did }}
            />
          ) : null}
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // `position: sticky` is web-only; RN's StyleSheet types it as
  // `absolute | relative | fixed`, so we have to cast through `object`
  // the same way the home tab's sticky tabs strip does. `top: 0` is
  // relative to the nearest scroll context — for the chat thread on
  // web, that's the document body (the WebTabLayout content View is
  // `overflow: visible`), which is exactly what we want.
  webThreadHeader: ({
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  } as object),
  webThreadHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  webThreadHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 1,
  },
  webThreadHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  webThreadHeaderHandle: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
  },
  webThreadHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
