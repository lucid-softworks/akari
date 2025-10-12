import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueskyEmbed } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RecordEmbed } from '@/components/RecordEmbed';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useConversations } from '@/hooks/queries/useConversations';
import { useMessages } from '@/hooks/queries/useMessages';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

const PLACEHOLDER_IMAGE = require('@/assets/images/partial-react-logo.png');

const ESTIMATED_MESSAGE_HEIGHT = 160; // balances standard bubbles and media embeds

type RecordEmbedData = Parameters<typeof RecordEmbed>[0]['embed'];
type ExternalEmbedData = Parameters<typeof ExternalEmbed>[0]['embed'];
type GifEmbedData = Parameters<typeof GifEmbed>[0]['embed'];
type YouTubeEmbedData = Parameters<typeof YouTubeEmbed>[0]['embed'];
type VideoEmbedData = Parameters<typeof VideoEmbed>[0]['embed'];

type MessageImageData = {
  url: string;
  alt: string;
};

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  sentAt: string;
  embed?: BlueskyEmbed;
};

type MessageError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

const isYouTubeUrl = (uri: string | undefined): boolean => {
  if (!uri) {
    return false;
  }

  const normalized = uri.toLowerCase();
  return (
    normalized.includes('youtube.com/watch') ||
    normalized.includes('youtu.be/') ||
    normalized.includes('music.youtube.com/watch') ||
    normalized.includes('youtube.com/embed/')
  );
};

const isGifUrl = (uri: string | undefined): boolean => {
  if (!uri) {
    return false;
  }

  const normalized = uri.toLowerCase();
  return (
    normalized.includes('tenor.com') ||
    normalized.includes('media.tenor.com') ||
    normalized.endsWith('.gif')
  );
};

const isVideoUrl = (uri: string | undefined): boolean => {
  if (!uri) {
    return false;
  }

  const normalized = uri.toLowerCase();
  const videoDomains = ['vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com'];

  for (const domain of videoDomains) {
    if (normalized.includes(domain)) {
      return true;
    }
  }

  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m3u8'];

  for (const extension of videoExtensions) {
    if (normalized.includes(extension)) {
      return true;
    }
  }

  return false;
};

const getRecordEmbedData = (embed: BlueskyEmbed | undefined): RecordEmbedData | null => {
  if (!embed) {
    return null;
  }

  if (embed.$type === 'app.bsky.embed.record#view' && embed.record) {
    return embed as RecordEmbedData;
  }

  if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.record) {
    return embed as RecordEmbedData;
  }

  return null;
};

const getVideoEmbedData = (embed: BlueskyEmbed | undefined): VideoEmbedData | null => {
  if (!embed) {
    return null;
  }

  if (embed.$type === 'app.bsky.embed.video#view' && embed.playlist) {
    return {
      videoUrl: embed.playlist,
      thumbnailUrl: embed.thumbnail,
      altText: embed.alt,
      aspectRatio: embed.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.video?.ref?.$link) {
    return {
      videoUrl: embed.video.ref.$link,
      thumbnailUrl: embed.video.ref.$link,
      altText: embed.video.alt,
      aspectRatio: embed.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.media?.$type === 'app.bsky.embed.video#view' && embed.media.playlist) {
    return {
      videoUrl: embed.media.playlist,
      thumbnailUrl: embed.media.thumbnail,
      altText: embed.media.alt,
      aspectRatio: embed.media.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.media?.video?.ref?.$link) {
    return {
      videoUrl: embed.media.video.ref.$link,
      thumbnailUrl: embed.media.video.ref.$link,
      altText: embed.media.video.alt,
      aspectRatio: embed.media.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.$type?.includes('app.bsky.embed.external') && embed.external) {
    const uri = embed.external.uri;
    if (!isYouTubeUrl(uri) && !isGifUrl(uri) && isVideoUrl(uri)) {
      return embed as VideoEmbedData;
    }
  }

  return null;
};

const getYouTubeEmbedData = (embed: BlueskyEmbed | undefined): YouTubeEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) {
    return null;
  }

  return isYouTubeUrl(embed.external.uri) ? (embed as YouTubeEmbedData) : null;
};

const getGifEmbedData = (embed: BlueskyEmbed | undefined): GifEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) {
    return null;
  }

  return isGifUrl(embed.external.uri) ? (embed as GifEmbedData) : null;
};

const getExternalEmbedData = (embed: BlueskyEmbed | undefined): ExternalEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) {
    return null;
  }

  const uri = embed.external.uri;
  if (isYouTubeUrl(uri) || isGifUrl(uri) || isVideoUrl(uri)) {
    return null;
  }

  return embed as ExternalEmbedData;
};

const getImageEmbedData = (embed: BlueskyEmbed | undefined): MessageImageData[] => {
  if (!embed) {
    return [];
  }

  const images: MessageImageData[] = [];

  const collectImages = (imageList: BlueskyEmbed['images'] | undefined) => {
    if (!imageList) {
      return;
    }

    for (const image of imageList) {
      if (image.image?.mimeType && image.image.mimeType.startsWith('video/')) {
        continue;
      }

      const url = image.fullsize || image.thumb;
      if (url) {
        images.push({
          url,
          alt: image.alt,
        });
      }
    }
  };

  collectImages(embed.images);

  if (embed.media?.images) {
    collectImages(embed.media.images);
  }

  return images;
};

export default function ConversationScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [messageText, setMessageText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const borderColor = useBorderColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const incomingMessageBackground = useThemeColor(
    { light: '#F3F4F6', dark: '#1E2537' },
    'background',
  );

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

  const handleMessageImageLoad = (imageUrl: string, width: number, height: number) => {
    if (width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)) {
      setImageDimensions((prev) => ({
        ...prev,
        [imageUrl]: { width, height },
      }));
    }
  };

  const renderMessageEmbed = (embed: BlueskyEmbed, messageId: string) => {
    const recordEmbed = getRecordEmbedData(embed);
    if (recordEmbed) {
      return <RecordEmbed embed={recordEmbed} />;
    }

    const videoEmbed = getVideoEmbedData(embed);
    if (videoEmbed) {
      return <VideoEmbed embed={{ ...videoEmbed, altText: videoEmbed.altText || t('common.video') }} />;
    }

    const youTubeEmbed = getYouTubeEmbedData(embed);
    if (youTubeEmbed) {
      return <YouTubeEmbed embed={youTubeEmbed} />;
    }

    const gifEmbed = getGifEmbedData(embed);
    if (gifEmbed) {
      return <GifEmbed embed={gifEmbed} />;
    }

    const externalEmbed = getExternalEmbedData(embed);
    if (externalEmbed) {
      return <ExternalEmbed embed={externalEmbed} />;
    }

    const imageData = getImageEmbedData(embed);
    if (imageData.length > 0) {
      return (
        <ThemedView style={styles.messageImagesContainer}>
          {imageData.map((image, index) => {
            const dimensions = imageDimensions[image.url];
            const imageWidth = 260;
            const imageHeight = dimensions ? (dimensions.height / dimensions.width) * imageWidth : 220;

            return (
              <Image
                key={`${messageId}-image-${index}`}
                source={{ uri: image.url }}
                style={[styles.messageImage, { width: imageWidth, height: imageHeight }]}
                contentFit="cover"
                placeholder={PLACEHOLDER_IMAGE}
                onLoad={(event) => handleMessageImageLoad(image.url, event.source.width, event.source.height)}
                accessible
                accessibilityLabel={image.alt || 'Image attachment'}
              />
            );
          })}
        </ThemedView>
      );
    }

    return null;
  };

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

  const renderMessage = ({ item }: { item: Message }) => {
    const hasText = item.text.trim().length > 0;
    const embedContent = item.embed ? renderMessageEmbed(item.embed, item.id) : null;

    return (
      <ThemedView style={[styles.messageContainer, item.isFromMe ? styles.myMessage : styles.theirMessage]}>
        {(hasText || !item.embed) && (
          <ThemedView
            style={[
              styles.messageBubble,
              item.isFromMe ? styles.myBubble : styles.theirBubble,
              {
                backgroundColor: item.isFromMe ? '#007AFF' : incomingMessageBackground,
              },
            ]}
          >
            {hasText && (
              <ThemedText style={[styles.messageText, { color: item.isFromMe ? 'white' : textColor }]}>
                {item.text}
              </ThemedText>
            )}
            <ThemedText style={[styles.messageTimestamp, { color: item.isFromMe ? 'rgba(255,255,255,0.6)' : iconColor }]}>
              {item.timestamp}
            </ThemedText>
          </ThemedView>
        )}

        {item.embed && (
          <ThemedView style={[styles.embedContainer, item.isFromMe ? styles.myEmbed : styles.theirEmbed]}>
            {embedContent ?? (
              <ThemedText style={[styles.unsupportedEmbedText, { color: iconColor }]}>
                {t('common.unknown')}
              </ThemedText>
            )}
            {!hasText && (
              <ThemedText
                style={[
                  styles.messageTimestamp,
                  !item.isFromMe ? styles.timestampIncoming : null,
                  { color: iconColor },
                ]}
              >
                {item.timestamp}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </ThemedView>
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
            <VirtualizedList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.2}
              ListFooterComponent={renderFooter}
              inverted={true} // Show newest messages at the bottom
              estimatedItemSize={ESTIMATED_MESSAGE_HEIGHT}
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
  timestampIncoming: {
    alignSelf: 'flex-start',
  },
  embedContainer: {
    maxWidth: '80%',
    marginTop: 8,
    gap: 8,
  },
  myEmbed: {
    alignSelf: 'flex-end',
  },
  theirEmbed: {
    alignSelf: 'flex-start',
  },
  messageImagesContainer: {
    gap: 8,
  },
  messageImage: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  unsupportedEmbedText: {
    fontSize: 14,
    opacity: 0.8,
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
