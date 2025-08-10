import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useConversations } from '@/hooks/queries/useConversations';
import { useMessages } from '@/hooks/queries/useMessages';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  sentAt: string;
};

type MessageError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

export default function ConversationScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [messageText, setMessageText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const borderColor = useBorderColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  // Keyboard state
  useEffect(() => {
    const keyboardWillShow = () => setIsKeyboardOpen(true);
    const keyboardWillHide = () => setIsKeyboardOpen(false);

    Keyboard.addListener('keyboardWillShow', keyboardWillShow);
    Keyboard.addListener('keyboardWillHide', keyboardWillHide);

    return () => {
      Keyboard.removeAllListeners('keyboardWillShow');
      Keyboard.removeAllListeners('keyboardWillHide');
    };
  }, []);

  // Get the conversation ID from the conversations list
  const { data: conversationsData } = useConversations();
  const conversation = conversationsData?.pages
    .flatMap((page) => page.conversations)
    .find((conv) => conv.handle === decodeURIComponent(handle));

  // Fetch messages for this conversation
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversation?.convoId, 50);

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation?.convoId) return;

    try {
      await sendMessageMutation.mutateAsync({
        convoId: conversation.convoId,
        text: messageText.trim(),
      });
      setMessageText('');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: t('messages.errorSendingMessage'),
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ThemedView style={[styles.messageContainer, item.isFromMe ? styles.myMessage : styles.theirMessage]}>
      <ThemedView
        style={[
          styles.messageBubble,
          item.isFromMe ? styles.myBubble : styles.theirBubble,
          {
            backgroundColor: item.isFromMe ? '#007AFF' : backgroundColor,
          },
        ]}
      >
        <ThemedText style={[styles.messageText, { color: item.isFromMe ? 'white' : textColor }]}>{item.text}</ThemedText>
        <ThemedText style={[styles.messageTimestamp, { color: item.isFromMe ? 'rgba(255,255,255,0.6)' : iconColor }]}>
          {item.timestamp}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );

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
      fetchNextPage();
    }
  };

  // Show loading state while finding conversation
  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color="#007AFF" />
            </TouchableOpacity>
            <ThemedView style={styles.headerInfo}>
              <ThemedText style={styles.headerTitle}>{decodeURIComponent(handle)}</ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.loadingState}>
            <ThemedText style={styles.loadingText}>
              {t('common.loading')} {t('common.conversations')}...
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Show error state
  if (messagesError) {
    const messageError = messagesError as MessageError;

    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color="#007AFF" />
            </TouchableOpacity>
            <ThemedView style={styles.headerInfo}>
              <ThemedText style={styles.headerTitle}>{decodeURIComponent(handle)}</ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.errorState}>
            <ThemedText style={styles.errorText}>{messageError.message}</ThemedText>
            {messageError.type === 'permission' && (
              <ThemedText style={styles.errorSubtext}>{t('common.errorLoadingMessages')}</ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Flatten all pages of messages into a single array
  const messages = messagesData?.pages.flatMap((page) => page.messages) || [];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.container}>
          {/* Header */}
          <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => {
                // Navigate to profile when header is clicked
                router.push(`/profile/${encodeURIComponent(handle)}`);
              }}
              activeOpacity={0.7}
            >
              {conversation?.avatar && (
                <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} contentFit="cover" />
              )}
              <ThemedView style={styles.headerTextContainer}>
                <ThemedText style={styles.headerTitle}>{conversation?.displayName || decodeURIComponent(handle)}</ThemedText>
                <ThemedText style={styles.headerHandle}>@{decodeURIComponent(handle)}</ThemedText>
              </ThemedView>
            </TouchableOpacity>
          </ThemedView>

          {/* Messages */}
          {messagesLoading ? (
            <ThemedView style={styles.loadingState}>
              <ThemedText style={styles.loadingText}>Loading messages...</ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              inverted={true} // Show newest messages at the bottom
            />
          )}

          {/* Message Input */}
          <ThemedView
            style={[
              styles.inputContainer,
              {
                borderTopColor: borderColor,
                paddingBottom: Platform.OS === 'ios' && !isKeyboardOpen ? insets.bottom + 35 : 12,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: backgroundColor,
                  borderColor: borderColor,
                  color: textColor,
                },
              ]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('messages.typeMessage')}
              placeholderTextColor={iconColor}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() || sendMessageMutation.isPending ? styles.sendButtonDisabled : null,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
            >
              <IconSymbol
                name={sendMessageMutation.isPending ? 'clock' : 'arrow.up.circle.fill'}
                size={32}
                color={messageText.trim() && !sendMessageMutation.isPending ? '#007AFF' : '#C7C7CC'}
              />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerHandle: {
    fontSize: 14,
    opacity: 0.6,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    // backgroundColor is set dynamically
  },
  theirBubble: {
    // backgroundColor is set dynamically
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTimestamp: {
    fontSize: 12,
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});
