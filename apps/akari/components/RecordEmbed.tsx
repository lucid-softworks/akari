import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableLink } from '@/components/ui/PressableLink';

import { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing, radius, fontSize, fontWeight, activeOpacity, layout } from '@/constants/tokens';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';
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

  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();

  // For recordWithMedia#view and other nested record shapes, the actual
  // quoted post lives at embed.record.record (or one level deeper). Walk the
  // chain so taps on quoted posts navigate to the correct uri.
  const quotedAuthor =
    embed.record.record?.record?.author ?? embed.record.record?.author ?? embed.record.author;
  const quotedUri =
    embed.record.record?.record?.uri ?? embed.record.record?.uri ?? embed.record.uri;
  const postActor = quotedAuthor?.handle;
  const postRKey = quotedUri?.split('/').pop();
  const postHref = postActor && postRKey ? `/profile/${postActor}/post/${postRKey}` : '#';
  const authorHref = postActor ? `/profile/${postActor}` : '#';

  const handlePress = () => {
    if (postActor && postRKey) {
      navigateToPost({ actor: postActor, rKey: postRKey });
    }
  };

  const handleAuthorPress = () => {
    if (postActor) {
      navigateToProfile({ actor: postActor });
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
    // Check multiple possible locations for the text content
    const recordValue = embed.record.record?.record?.value || embed.record.record?.value || embed.record.value;

    if (recordValue?.text) {
      return recordValue.text;
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
  const { urls: imageUrls } = imageData;

  // Detect "unavailable" record variants. The lexicon uses dedicated
  // $type values for each case — blocked author, deleted post, detached
  // quote — and any of them should render as a minimal placeholder
  // instead of the normal author/content layout (which can't fill in
  // the missing fields and used to fall back to a confusing bare
  // "Block" label).
  //
  // The $type can sit at one of several depths depending on whether the
  // post is a regular record embed or a recordWithMedia embed, so we
  // probe each plausible location.
  const candidateTypes: (string | undefined)[] = [
    (embed as { $type?: string })?.$type,
    embed.record?.$type,
    (embed.record as { record?: { $type?: string } } | undefined)?.record?.$type,
    (embed.record as { record?: { record?: { $type?: string } } } | undefined)
      ?.record?.record?.$type,
  ];
  const recordType = candidateTypes.find((s) =>
    typeof s === 'string' &&
    (s.includes('viewBlocked') ||
      s.includes('viewNotFound') ||
      s.includes('viewDetached')),
  );
  // The record viewer also gets populated when the relationship is
  // mutual or the user is doing the blocking — fall back to that as a
  // signal even when $type isn't carried through.
  const viewerOnRecord =
    (embed.record as { author?: { viewer?: { blocking?: string; blockedBy?: boolean } } })
      ?.author?.viewer ??
    (embed.record.record as { author?: { viewer?: { blocking?: string; blockedBy?: boolean } } } | undefined)
      ?.author?.viewer;
  const viewerImpliesBlocked =
    !!viewerOnRecord && (!!viewerOnRecord.blocking || !!viewerOnRecord.blockedBy);
  const unavailableKind: 'blocked' | 'notFound' | 'detached' | null = recordType
    ? recordType.includes('viewBlocked')
      ? 'blocked'
      : recordType.includes('viewNotFound')
      ? 'notFound'
      : 'detached'
    : viewerImpliesBlocked
    ? 'blocked'
    : null;
  const isBlockedRecord = unavailableKind === 'blocked';

  // Get the author's DID or handle for profile lookup. Use the
  // shallowest identifier we can find so the placeholder picks up a
  // handle/avatar even when only the direct `embed.record.author` is
  // populated (which is the common case for blocked records).
  const authorIdentifier =
    embed.record.author?.handle ||
    embed.record.author?.did ||
    embed.record.record?.author?.handle ||
    embed.record.record?.author?.did ||
    embed.record.record?.record?.author?.handle ||
    embed.record.record?.record?.author?.did;

  // Fetch profile information if needed
  const { data: profileData } = useProfile(authorIdentifier);

  // Determine the blocking scenario
  const getBlockingMessage = () => {
    if (!isBlockedRecord) {
      return null;
    }

    // Only show blocking message if we have proper viewer info
    const viewer =
      embed.record.record?.record?.author?.viewer || embed.record.record?.author?.viewer || embed.record.author?.viewer;

    if (!viewer) {
      return null; // Don't show blocking message without proper viewer info
    }

    const { blockedBy, blocking } = viewer;

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

  // Get author information from available sources. We prefer whatever
  // identifier is on the record itself (handle when present, falling
  // back to DID), then upgrade with the resolved profile from
  // useProfile when it lands. This keeps blocked records from
  // rendering as anonymous "Block" boxes — we always know at least
  // who's on the other side, even if we can't fetch their profile.
  const getAuthorInfo = () => {
    const author =
      embed.record.author ||
      embed.record.record?.author ||
      embed.record.record?.record?.author;

    if (author?.handle) {
      return {
        handle: author.handle,
        displayName: author.displayName || author.handle,
        avatar: author.avatar,
      };
    }

    if (profileData) {
      return {
        handle: profileData.handle,
        displayName: profileData.displayName || profileData.handle,
        avatar: profileData.avatar,
      };
    }

    const did =
      author?.did ||
      embed.record.record?.author?.did ||
      embed.record.record?.record?.author?.did;
    if (did) {
      return { handle: did, displayName: did, avatar: undefined };
    }

    return null;
  };

  const authorInfo = getAuthorInfo();

  // Unavailable variants (blocked / not found / detached) get a minimal
  // placeholder. We also fall through to this path when we couldn't
  // resolve any author info at all — that means the upstream record is
  // malformed or hidden, and the normal author header would be empty.
  if (unavailableKind || !authorInfo) {
    const kind = unavailableKind ?? 'unknown';
    // Show the handle whenever we know it — even when it duplicates the
    // display name, it's still useful context for the reader.
    const handleLabel = authorInfo?.handle
      ? authorInfo.handle.startsWith('did:')
        ? authorInfo.handle
        : `@${authorInfo.handle}`
      : null;
    const placeholderMessage =
      kind === 'blocked'
        ? blockingMessage ?? t('post.blockedPost')
        : kind === 'notFound'
        ? t('post.deletedPost')
        : kind === 'detached'
        ? t('post.detachedPost')
        : t('post.unavailablePost');
    const iconName: 'hand.raised.fill' | 'eye.slash' | 'link.badge.plus' =
      kind === 'blocked'
        ? 'hand.raised.fill'
        : kind === 'notFound'
        ? 'eye.slash'
        : kind === 'detached'
        ? 'link.badge.plus'
        : 'eye.slash';
    return (
      <View
        style={[
          styles.container,
          styles.blockedPlaceholder,
          { borderColor, backgroundColor: 'transparent' },
        ]}
      >
        <IconSymbol name={iconName} size={18} color={secondaryTextColor} />
        <View style={styles.blockedPlaceholderText}>
          <ThemedText
            style={[styles.blockedPlaceholderTitle, { color: textColor }]}
            numberOfLines={1}
          >
            {placeholderMessage}
          </ThemedText>
          {handleLabel ? (
            <ThemedText
              style={[styles.blockedPlaceholderHandle, { color: secondaryTextColor }]}
              numberOfLines={1}
            >
              {handleLabel}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <PressableLink href={postHref} onPress={handlePress} style={{ opacity: 1 }}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <ThemedView style={styles.header}>
          {authorInfo ? (
            <PressableLink href={authorHref} onPress={handleAuthorPress} style={styles.authorSection}>
              <Image
                source={{
                  uri: authorInfo.avatar || 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
              <ThemedView style={styles.authorInfo}>
                <ThemedText style={[styles.displayName, { color: textColor }]}>{authorInfo.displayName}</ThemedText>
                <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>@{authorInfo.handle}</ThemedText>
                {blockingMessage && (
                  <ThemedText style={[styles.blockingMessage, { color: secondaryTextColor }]}>{blockingMessage}</ThemedText>
                )}
              </ThemedView>
            </PressableLink>
          ) : (
            <ThemedView style={styles.authorSection}>
              <Image
                source={{
                  uri: 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
              <ThemedView style={styles.authorInfo}>
                <ThemedText style={[styles.displayName, { color: textColor }]}>{blockingMessage}</ThemedText>
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
            {quotedText.trim() ? (
              <RichTextWithFacets
                text={quotedText}
                facets={(embed.record as any)?.facets}
                style={[styles.text, { color: textColor }]}
              />
            ) : null}

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
                      onLoad={(event) => handleImageLoad(imageUrl, event.source.width, event.source.height)}
                    />
                  );
                })}
              </ThemedView>
            )}
          </ThemedView>
        )}
      </View>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    marginTop: 6,
    overflow: 'hidden',
  },
  blockedPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  blockedPlaceholderText: {
    flex: 1,
  },
  blockedPlaceholderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  blockedPlaceholderHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
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
    borderRadius: radius.full,
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.xs,
  },
  timestamp: {
    fontSize: 10,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: 18,
    marginBottom: 6,
  },
  mediaPreview: {
    marginTop: 3,
  },
  imagesContainer: {
    gap: spacing.xs,
  },
  image: {
    width: '100%',
    borderRadius: radius.sm,
    borderWidth: layout.border,
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  externalDescription: {
    fontSize: 10,
  },
  footer: {
    paddingHorizontal: 10,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xxs,
  },
  quoteIndicator: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  blockingMessage: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: spacing.xxs,
  },
});
