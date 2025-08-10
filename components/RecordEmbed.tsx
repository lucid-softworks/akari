import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyEmbed, BlueskyRecord } from '@/utils/bluesky/types';
import { formatRelativeTime } from '@/utils/timeUtils';

type RecordEmbedProps = {
  /** Record embed data from Bluesky */
  embed: BlueskyEmbed & {
    record: BlueskyRecord;
    media?: BlueskyEmbed;
  };
};

/**
 * Component to display record embeds (quoted posts)
 * Shows the quoted post's content, author, and allows navigation to the original post
 */
export function RecordEmbed({ embed }: RecordEmbedProps) {
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const { t } = useTranslation();
  const textColor = useThemeColor(
    {
      light: '#000000',
      dark: '#ffffff',
    },
    'text',
  );

  const secondaryTextColor = useThemeColor(
    {
      light: '#666666',
      dark: '#999999',
    },
    'text',
  );

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  const handlePress = () => {
    // Navigate to the quoted post
    router.push(`/post/${encodeURIComponent(embed.record.uri)}`);
  };

  const handleAuthorPress = () => {
    // Navigate to the quoted post's author profile
    if (embed.record.author?.handle) {
      router.push(`/profile/${encodeURIComponent(embed.record.author.handle)}`);
    }
  };

  const handleImageLoad = (imageUrl: string, width: number, height: number) => {
    // Only store valid dimensions
    if (width > 0 && height > 0 && isFinite(width) && isFinite(height)) {
      setImageDimensions((prev) => ({
        ...prev,
        [imageUrl]: { width, height },
      }));
    }
  };

  // Extract text from the quoted post's record
  const getQuotedText = (): string => {
    // Check if the record has a 'value' property (which contains the actual post data)
    if (typeof embed.record.value === 'object' && embed.record.value && 'text' in embed.record.value) {
      return (embed.record.value as { text: string }).text;
    }
    // Fallback to checking record.record (for older format)
    if (typeof embed.record.record === 'object' && embed.record.record && 'text' in embed.record.record) {
      return (embed.record.record as { text: string }).text;
    }
    return '';
  };

  const quotedText = getQuotedText();

  // Get media data from the quoted post
  const getImageData = () => {
    // Check both embed and embeds fields
    const embedData = embed.record.embed;
    const embedsData = embed.record.embeds;

    if (embedData?.images && embedData.images.length > 0) {
      // Filter out video files, only show actual images (including GIFs)
      const imageFiles = embedData.images.filter((img) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'));
      const urls = imageFiles.map((img) => img.fullsize);
      const altTexts = imageFiles.map((img) => img.alt);
      return { urls, altTexts };
    }

    if (embedsData) {
      for (const embedItem of embedsData) {
        if (embedItem.images && embedItem.images.length > 0) {
          // Filter out video files, only show actual images (including GIFs)
          const imageFiles = embedItem.images.filter(
            (img) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
          );
          const urls = imageFiles.map((img) => img.fullsize);
          const altTexts = imageFiles.map((img) => img.alt);
          return { urls, altTexts };
        }
      }
    }

    return { urls: [], altTexts: [] };
  };

  // Extract video data from embed
  const getVideoData = () => {
    // Check main embed first
    if (embed.record.embed) {
      // Handle Bluesky native video embeds (app.bsky.embed.video#view)
      if (embed.record.embed.$type === 'app.bsky.embed.video#view' && embed.record.embed.playlist) {
        return {
          videoUrl: embed.record.embed.playlist,
          thumbnailUrl: embed.record.embed.thumbnail,
          altText: embed.record.embed.alt || t('common.video'),
          aspectRatio: embed.record.embed.aspectRatio,
        };
      }

      // Handle legacy video embeds (app.bsky.embed.video)
      if (embed.record.embed.video) {
        return {
          videoUrl: embed.record.embed.video.ref.$link,
          thumbnailUrl: embed.record.embed.video.ref.$link, // Use video URL as thumbnail for now
          altText: embed.record.embed.video.alt || t('common.video'),
          aspectRatio: embed.record.embed.aspectRatio,
        };
      }

      // Handle record with media embeds that might contain video
      if (embed.record.embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.record.embed.media) {
        if (embed.record.embed.media.$type === 'app.bsky.embed.video#view' && embed.record.embed.media.playlist) {
          return {
            videoUrl: embed.record.embed.media.playlist,
            thumbnailUrl: embed.record.embed.media.thumbnail,
            altText: embed.record.embed.media.alt || t('common.video'),
            aspectRatio: embed.record.embed.media.aspectRatio,
          };
        }
        if (embed.record.embed.media.video) {
          return {
            videoUrl: embed.record.embed.media.video.ref.$link,
            thumbnailUrl: embed.record.embed.media.video.ref.$link,
            altText: embed.record.embed.media.video.alt || t('common.video'),
            aspectRatio: embed.record.embed.media.aspectRatio,
          };
        }
      }
    }

    // Check embeds array if main embed doesn't have video
    if (embed.record.embeds) {
      for (const embedItem of embed.record.embeds) {
        if (embedItem.$type === 'app.bsky.embed.video#view' && embedItem.playlist) {
          return {
            videoUrl: embedItem.playlist,
            thumbnailUrl: embedItem.thumbnail,
            altText: embedItem.alt || t('common.video'),
            aspectRatio: embedItem.aspectRatio,
          };
        }
        if (embedItem.video) {
          return {
            videoUrl: embedItem.video.ref.$link,
            thumbnailUrl: embedItem.video.ref.$link,
            altText: embedItem.video.alt || t('common.video'),
            aspectRatio: embedItem.aspectRatio,
          };
        }
      }
    }

    return null;
  };

  // Check for external embeds
  const getEmbedData = () => {
    if (embed.record.embed?.external) {
      return {
        $type: 'app.bsky.embed.external#view' as const,
        external: {
          ...embed.record.embed.external,
          thumb: embed.record.embed.external.thumb
            ? {
                $type: 'blob' as const,
                ...embed.record.embed.external.thumb,
              }
            : undefined,
        },
      };
    }
    if (embed.record.embeds) {
      for (const embedItem of embed.record.embeds) {
        if (embedItem.external) {
          return {
            $type: 'app.bsky.embed.external#view' as const,
            external: {
              ...embedItem.external,
              thumb: embedItem.external.thumb
                ? {
                    $type: 'blob' as const,
                    ...embedItem.external.thumb,
                  }
                : undefined,
            },
          };
        }
      }
    }
    return null;
  };

  // Check if embed is a GIF embed
  const isGifEmbed = () => {
    const embedData = getEmbedData();
    if (!embedData) return false;

    const uri = embedData.external?.uri || '';
    return uri.includes('tenor.com') || uri.includes('media.tenor.com') || uri.endsWith('.gif');
  };

  // Check for video embeds
  const getVideoEmbedData = () => {
    if (embed.record.embed?.external) {
      return {
        $type: 'app.bsky.embed.external#view' as const,
        external: {
          ...embed.record.embed.external,
          thumb: embed.record.embed.external.thumb
            ? {
                $type: 'blob' as const,
                ...embed.record.embed.external.thumb,
              }
            : undefined,
        },
      };
    }
    if (embed.record.embeds) {
      for (const embedItem of embed.record.embeds) {
        if (embedItem.external) {
          return {
            $type: 'app.bsky.embed.external#view' as const,
            external: {
              ...embedItem.external,
              thumb: embedItem.external.thumb
                ? {
                    $type: 'blob' as const,
                    ...embedItem.external.thumb,
                  }
                : undefined,
            },
          };
        }
      }
    }
    return null;
  };

  // Helper functions to check embed types
  const isYouTubeEmbed = () => {
    const embedData = getEmbedData();
    return embedData?.external?.uri?.includes('youtube.com') || embedData?.external?.uri?.includes('youtu.be');
  };

  const isExternalEmbed = () => {
    const embedData = getEmbedData();
    return embedData && !isYouTubeEmbed() && !isGifEmbed();
  };

  const isNativeVideoEmbed = () => {
    return (
      embed.record.embed?.$type === 'app.bsky.embed.video#view' ||
      embed.record.embed?.video ||
      embed.record.embeds?.some((e) => e.$type === 'app.bsky.embed.video#view' || e.video)
    );
  };

  const isExternalVideoEmbed = () => {
    const embedData = getVideoEmbedData();
    return embedData && !isYouTubeEmbed();
  };

  const imageData = getImageData();
  const videoData = getVideoData();
  const { urls: imageUrls, altTexts } = imageData;

  // Check if this is a blocked record by checking the $type field
  const isBlockedRecord = embed.record.record?.$type === 'app.bsky.embed.record#viewBlocked';

  // Get the author's DID or handle for profile lookup
  const authorIdentifier = isBlockedRecord
    ? embed.record.record?.author?.did
    : embed.record.author?.handle || embed.record.author?.did;

  // Fetch profile information if needed
  const { data: profileData } = useProfile(authorIdentifier);

  // Determine the blocking scenario
  const getBlockingMessage = () => {
    if (!isBlockedRecord || !embed.record.record?.author?.viewer) {
      return null;
    }

    const { blockedBy, blocking } = embed.record.record.author.viewer;

    if (blockedBy && blocking) {
      return t('profile.mutualBlock');
    } else if (blockedBy) {
      return t('profile.youAreBlockedByUser');
    } else if (blocking) {
      return t('profile.youHaveBlockedUser');
    }

    return null;
  };

  const blockingMessage = getBlockingMessage();

  // Get author information from available sources
  const getAuthorInfo = () => {
    if (!isBlockedRecord && embed.record.author?.handle && embed.record.author?.displayName) {
      return {
        handle: embed.record.author.handle,
        displayName: embed.record.author.displayName,
        avatar: embed.record.author.avatar,
      };
    }

    if (isBlockedRecord && profileData) {
      return {
        handle: profileData.handle,
        displayName: profileData.displayName || profileData.handle,
        avatar: profileData.avatar,
      };
    }

    if (isBlockedRecord && embed.record.record?.author?.did) {
      return {
        handle: embed.record.record.author.did,
        displayName: embed.record.record.author.did,
        avatar: undefined,
      };
    }

    return null;
  };

  const authorInfo = getAuthorInfo();

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <ThemedView style={styles.header}>
          {authorInfo ? (
            <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7} style={styles.authorSection}>
              <Image
                source={{
                  uri: authorInfo.avatar || 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
              <ThemedView style={styles.authorInfo}>
                <ThemedText style={[styles.displayName, { color: textColor }]}>{authorInfo.displayName}</ThemedText>
                <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>@{authorInfo.handle}</ThemedText>
                {blockingMessage && (
                  <ThemedText style={[styles.blockingMessage, { color: secondaryTextColor }]}>{blockingMessage}</ThemedText>
                )}
              </ThemedView>
            </TouchableOpacity>
          ) : (
            <ThemedView style={styles.authorSection}>
              <Image
                source={{
                  uri: 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
              <ThemedView style={styles.authorInfo}>
                <ThemedText style={[styles.displayName, { color: textColor }]}>
                  {blockingMessage || t('profile.youAreBlockedByUser')}
                </ThemedText>
                <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>{t('common.block')}</ThemedText>
              </ThemedView>
            </ThemedView>
          )}
          <ThemedText style={[styles.timestamp, { color: secondaryTextColor }]}>
            {embed.record.indexedAt ? formatRelativeTime(embed.record.indexedAt) : ''}
          </ThemedText>
        </ThemedView>

        {!isBlockedRecord && (
          <ThemedView style={styles.content}>
            <RichTextWithFacets
              text={quotedText}
              facets={(embed.record as any)?.facets}
              style={[styles.text, { color: textColor }]}
            />

            {/* Render native video embed if present */}
            {(() => {
              const isNative = isNativeVideoEmbed();
              return isNative && videoData && <VideoEmbed embed={videoData} />;
            })()}

            {/* Render external video embed if present */}
            {(() => {
              const isExternalVideo = isExternalVideoEmbed();
              const videoEmbedData = getVideoEmbedData();
              return isExternalVideo && videoEmbedData && <VideoEmbed embed={videoEmbedData} />;
            })()}

            {/* Render YouTube embed if present */}
            {(() => {
              const isYouTube = isYouTubeEmbed();
              const embedData = getEmbedData();
              return isYouTube && embedData && <YouTubeEmbed embed={embedData} />;
            })()}

            {/* Render GIF embed if present */}
            {(() => {
              const isGif = isGifEmbed();
              const embedData = getEmbedData();
              return isGif && embedData && <GifEmbed embed={embedData} />;
            })()}

            {/* Render external embed if present (non-YouTube, non-GIF) */}
            {(() => {
              const isExternal = isExternalEmbed();
              const embedData = getEmbedData();
              return isExternal && embedData && <ExternalEmbed embed={embedData} />;
            })()}

            {/* Render images if present */}
            {imageUrls.length > 0 && (
              <ThemedView style={styles.imagesContainer}>
                {imageUrls.map((imageUrl: string, index: number) => {
                  const dimensions = imageDimensions[imageUrl];
                  const screenWidth = 300; // Smaller width for quoted posts
                  const imageHeight = dimensions ? (dimensions.height / dimensions.width) * screenWidth : 200;

                  return (
                    <Image
                      key={`${embed.record.uri}-image-${index}`}
                      source={{ uri: imageUrl }}
                      style={[styles.image, { height: imageHeight }]}
                      contentFit="contain"
                      placeholder={require('@/assets/images/partial-react-logo.png')}
                      onLoad={(event) => handleImageLoad(imageUrl, event.source.width, event.source.height)}
                    />
                  );
                })}
              </ThemedView>
            )}
          </ThemedView>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 13,
    fontWeight: '600',
  },
  handle: {
    fontSize: 11,
  },
  timestamp: {
    fontSize: 10,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  mediaPreview: {
    marginTop: 3,
  },
  imagesContainer: {
    gap: 4,
  },
  image: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent', // Will be overridden by theme color
  },
  mediaThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 6,
  },
  externalPreview: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  externalInfo: {
    flex: 1,
  },
  externalTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  externalDescription: {
    fontSize: 10,
  },
  footer: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 2,
  },
  quoteIndicator: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  blockingMessage: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
