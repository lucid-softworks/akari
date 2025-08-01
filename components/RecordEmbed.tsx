import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <ThemedView style={styles.header}>
          {embed.record.author ? (
            <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7} style={styles.authorSection}>
              <Image
                source={{
                  uri: embed.record.author.avatar || 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
              <ThemedView style={styles.authorInfo}>
                <ThemedText style={[styles.displayName, { color: textColor }]}>
                  {embed.record.author.displayName || embed.record.author.handle}
                </ThemedText>
                <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>@{embed.record.author.handle}</ThemedText>
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
                <ThemedText style={[styles.displayName, { color: textColor }]}>{t('common.unknown')}</ThemedText>
                <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>@unknown</ThemedText>
              </ThemedView>
            </ThemedView>
          )}
          <ThemedText style={[styles.timestamp, { color: secondaryTextColor }]}>
            {embed.record.indexedAt ? formatRelativeTime(embed.record.indexedAt) : ''}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <RichTextWithFacets
            text={quotedText}
            facets={(embed.record as any)?.facets}
            style={[styles.text, { color: textColor }]}
          />

          {/* Show media preview if the quoted post has media */}
          {(embed.record.embed || embed.media || embed.record.embeds) && (
            <ThemedView style={styles.mediaPreview}>
              {/* Handle recordWithMedia embeds - media is in embed.media */}
              {embed.media?.images && embed.media.images.length > 0 && (
                <ThemedView style={styles.imagesContainer}>
                  {embed.media.images.map((image, index) => {
                    const dimensions = imageDimensions[image.fullsize];
                    const screenWidth = 400; // Approximate screen width minus padding
                    const imageHeight =
                      dimensions &&
                      dimensions.width > 0 &&
                      dimensions.height > 0 &&
                      isFinite(dimensions.width) &&
                      isFinite(dimensions.height)
                        ? (dimensions.height / dimensions.width) * screenWidth
                        : 300;

                    return (
                      <Image
                        key={index}
                        source={{ uri: image.fullsize }}
                        style={[styles.image, { height: imageHeight }]}
                        contentFit="contain"
                        placeholder={require('@/assets/images/partial-react-logo.png')}
                        onLoad={(event) => handleImageLoad(image.fullsize, event.source.width, event.source.height)}
                      />
                    );
                  })}
                </ThemedView>
              )}

              {/* Handle regular record embeds - media is in embed.record.embed */}
              {embed.record.embed?.images && embed.record.embed.images.length > 0 && (
                <ThemedView style={styles.imagesContainer}>
                  {embed.record.embed.images.map((image, index) => {
                    const dimensions = imageDimensions[image.fullsize];
                    const screenWidth = 400; // Approximate screen width minus padding
                    const imageHeight =
                      dimensions && dimensions.width > 0 ? (dimensions.height / dimensions.width) * screenWidth : 300;

                    return (
                      <Image
                        key={index}
                        source={{ uri: image.fullsize }}
                        style={[styles.image, { height: imageHeight }]}
                        contentFit="contain"
                        placeholder={require('@/assets/images/partial-react-logo.png')}
                        onLoad={(event) => handleImageLoad(image.fullsize, event.source.width, event.source.height)}
                      />
                    );
                  })}
                </ThemedView>
              )}

              {/* Handle embeds array in record */}
              {embed.record.embeds &&
                embed.record.embeds.length > 0 &&
                embed.record.embeds.map((recordEmbed: BlueskyEmbed, index: number) => (
                  <ThemedView key={index}>
                    {/* Handle images in embeds array */}
                    {recordEmbed.images && recordEmbed.images.length > 0 && (
                      <ThemedView style={styles.imagesContainer}>
                        {recordEmbed.images.map((image, imageIndex) => {
                          const dimensions = imageDimensions[image.fullsize];
                          const screenWidth = 400; // Approximate screen width minus padding
                          const imageHeight =
                            dimensions && dimensions.width > 0 ? (dimensions.height / dimensions.width) * screenWidth : 300;

                          return (
                            <Image
                              key={imageIndex}
                              source={{ uri: image.fullsize }}
                              style={[styles.image, { height: imageHeight }]}
                              contentFit="contain"
                              placeholder={require('@/assets/images/partial-react-logo.png')}
                              onLoad={(event) => handleImageLoad(image.fullsize, event.source.width, event.source.height)}
                            />
                          );
                        })}
                      </ThemedView>
                    )}

                    {/* Handle external embeds in embeds array */}
                    {recordEmbed.external && (
                      <ThemedView style={styles.externalPreview}>
                        {recordEmbed.external.thumb?.ref?.$link && (
                          <Image
                            source={{ uri: recordEmbed.external.thumb.ref.$link }}
                            style={styles.mediaThumbnail}
                            contentFit="cover"
                            placeholder={require('@/assets/images/partial-react-logo.png')}
                          />
                        )}
                        <ThemedView style={styles.externalInfo}>
                          <ThemedText style={[styles.externalTitle, { color: textColor }]} numberOfLines={1}>
                            {recordEmbed.external.title}
                          </ThemedText>
                          <ThemedText style={[styles.externalDescription, { color: secondaryTextColor }]} numberOfLines={1}>
                            {recordEmbed.external.description}
                          </ThemedText>
                        </ThemedView>
                      </ThemedView>
                    )}
                  </ThemedView>
                ))}

              {/* Handle external embeds in recordWithMedia */}
              {embed.media?.external && (
                <ThemedView style={styles.externalPreview}>
                  {embed.media.external.thumb?.ref?.$link && (
                    <Image
                      source={{ uri: embed.media.external.thumb.ref.$link }}
                      style={styles.mediaThumbnail}
                      contentFit="cover"
                      placeholder={require('@/assets/images/partial-react-logo.png')}
                    />
                  )}
                  <ThemedView style={styles.externalInfo}>
                    <ThemedText style={[styles.externalTitle, { color: textColor }]} numberOfLines={1}>
                      {embed.media.external.title}
                    </ThemedText>
                    <ThemedText style={[styles.externalDescription, { color: secondaryTextColor }]} numberOfLines={1}>
                      {embed.media.external.description}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              )}

              {/* Handle external embeds in regular record embeds */}
              {embed.record.embed?.external && (
                <ThemedView style={styles.externalPreview}>
                  {embed.record.embed.external.thumb?.ref?.$link && (
                    <Image
                      source={{ uri: embed.record.embed.external.thumb.ref.$link }}
                      style={styles.mediaThumbnail}
                      contentFit="cover"
                      placeholder={require('@/assets/images/partial-react-logo.png')}
                    />
                  )}
                  <ThemedView style={styles.externalInfo}>
                    <ThemedText style={[styles.externalTitle, { color: textColor }]} numberOfLines={1}>
                      {embed.record.embed.external.title}
                    </ThemedText>
                    <ThemedText style={[styles.externalDescription, { color: secondaryTextColor }]} numberOfLines={1}>
                      {embed.record.embed.external.description}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              )}
            </ThemedView>
          )}
        </ThemedView>
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
});
