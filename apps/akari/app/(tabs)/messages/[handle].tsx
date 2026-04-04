import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueskyEmbed } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RecordEmbed } from '@/components/RecordEmbed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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
import { useNavigateToProfile } from '@/utils/navigation';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';

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
  return normalized.includes('tenor.com') || normalized.includes('media.tenor.com') || normalized.endsWith('.gif');
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
  const [headerY, setHeaderY] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const borderColor = useBorderColor();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigateToProfile = useNavigateToProfile();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const incomingMessageBackground = useThemeColor({ light: '#E9EAEC', dark: '#2c2c2e' }, 'background');
  const outgoingMessageBackground = useThemeColor({ light: '#7C8CF9', dark: '#5A67D8' }, 'tint');


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
    } catch {
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
                backgroundColor: item.isFromMe ? outgoingMessageBackground : incomingMessageBackground,
              },
            ]}
          >
            {hasText && (
              <ThemedText style={[styles.messageText, { color: item.isFromMe ? '#fff' : textColor }]}>
                {item.text}
              </ThemedText>
            )}
          </ThemedView>
        )}

        {item.embed && (
          <ThemedView style={[styles.embedContainer, item.isFromMe ? styles.myEmbed : styles.theirEmbed]}>
            {embedContent ?? (
              <ThemedText style={[styles.unsupportedEmbedText, { color: iconColor }]}>{t('common.unknown')}</ThemedText>
            )}
          </ThemedView>
        )}

        <ThemedText
          style={[
            styles.messageTimestamp,
            item.isFromMe ? styles.timestampOutgoing : styles.timestampIncoming,
            { color: iconColor },
          ]}
        >
          {item.timestamp}
        </ThemedText>
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
      void fetchNextPage();
    }
  };

  // Show loading state while finding conversation
  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
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
  // API returns newest first; reverse to chronological order (oldest first)
  const messages = (messagesData?.pages.flatMap((page) => page.messages) || []).slice().reverse();

  return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={headerY}
        onLayout={(e) => {
          if (Platform.OS === 'ios') {
            e.target.measureInWindow((_x: number, y: number) => {
              if (y > 0) setHeaderY(y);
            });
          }
        }}
      >
          {messagesLoading ? (
            <View style={styles.loadingState}>
              <ThemedText style={styles.loadingText}>Loading messages...</ThemedText>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <VirtualizedList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.2}
                ListFooterComponent={renderFooter}
                estimatedItemSize={ESTIMATED_MESSAGE_HEIGHT}
                initialScrollIndex={messages.length > 0 ? messages.length - 1 : undefined}
              />
            </View>
          )}

          <ThemedView
            style={[
              styles.inputContainer,
              {
                borderTopColor: borderColor,
                paddingBottom: insets.bottom || spacing.md,
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
      </KeyboardAvoidingView>
  );
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.lg,
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
    maxWidth: '80%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  myBubble: {
    // backgroundColor is set dynamically
  },
  theirBubble: {
    // backgroundColor is set dynamically
  },
  messageText: {
    fontSize: fontSize.lg,
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
  messageImagesContainer: {
    gap: spacing.sm,
  },
  messageImage: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  unsupportedEmbedText: {
    fontSize: fontSize.base,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: layout.hairline,
  },
  textInput: {
    flex: 1,
    borderWidth: layout.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    fontSize: fontSize.lg,
  },
  sendButton: {
    padding: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: opacity.tertiary,
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
  errorTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.lg,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
});
