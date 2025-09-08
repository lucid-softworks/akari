import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { ImageViewer } from '@/components/ImageViewer';
import { Labels } from '@/components/Labels';
import { PostComposer } from '@/components/PostComposer';
import { RecordEmbed } from '@/components/RecordEmbed';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyEmbed, BlueskyImage, BlueskyLabel } from '@/bluesky-api';

type PostCardProps = {
  post: {
    id: string;
    text?: string;
    author: {
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    createdAt: string;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
    embed?: BlueskyEmbed;
    embeds?: BlueskyEmbed[]; // Added embeds field
    /** Reply context - what this post is replying to */
    replyTo?: {
      author: {
        handle: string;
        displayName?: string;
      };
      text?: string;
    };
    /** Labels applied to the post */
    labels?: BlueskyLabel[];
    /** Viewer's interaction with the post */
    viewer?: {
      like?: string;
      repost?: string;
      reply?: string;
    };
    /** Facets for rich text rendering */
    facets?: {
      index: {
        byteStart: number;
        byteEnd: number;
      };
      features: {
        $type: string;
        uri?: string;
        tag?: string;
      }[];
    }[];
    /** Post URI and CID for like functionality */
    uri?: string;
    cid?: string;
  };
  onPress?: () => void;
};

export function PostCard({ post, onPress }: PostCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const { t } = useTranslation();
  const likeMutation = useLikePost();

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  const iconColor = useThemeColor(
    {
      light: '#687076',
      dark: '#9BA1A6',
    },
    'text',
  );

  const handleProfilePress = () => {
    router.push(`/profile/${encodeURIComponent(post.author.handle)}`);
  };

  const handleLikePress = () => {
    if (!post.uri || !post.cid) return;

    if (!!post.viewer?.like) {
      // Unlike the post
      likeMutation.mutate({
        postUri: post.uri,
        likeUri: post.viewer.like,
        action: 'unlike',
      });
    } else {
      // Like the post
      likeMutation.mutate({
        postUri: post.uri,
        postCid: post.cid,
        action: 'like',
      });
    }
  };

  const handleReplyPress = () => {
    setShowReplyComposer(true);
  };

  const handleImageLoad = (imageUrl: string, width: number, height: number) => {
    setImageDimensions((prev) => ({
      ...prev,
      [imageUrl]: { width, height },
    }));
  };

  // Extract image URLs and alt text from embed data
  const getImageData = () => {
    // Check both embed and embeds fields
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData) return { urls: [], altTexts: [] };

    // Handle different embed types
    if (embedData.$type === 'app.bsky.embed.images' || embedData.$type === 'app.bsky.embed.images#view') {
      // Filter out video files, only show actual images
      const imageFiles =
        embedData.images?.filter((img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/')) ||
        [];

      const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean) || [];
      const altTexts = imageFiles.map((img: BlueskyImage) => img.alt) || [];
      return { urls, altTexts };
    }

    // Handle record with media embeds (quoted post with media added by quoter)
    if (embedData.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.media) {
      if (embedData.media.$type === 'app.bsky.embed.images#view' && embedData.media.images) {
        // Filter out video files, only show actual images
        const imageFiles = embedData.media.images.filter(
          (img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
        );

        const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean);
        const altTexts = imageFiles.map((img: BlueskyImage) => img.alt);
        return { urls, altTexts };
      }
    }

    // Handle other embed types that might contain images
    if (embedData.images) {
      // Filter out video files, only show actual images
      const imageFiles = embedData.images.filter(
        (img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
      );

      const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean);
      const altTexts = imageFiles.map((img: BlueskyImage) => img.alt);
      return { urls, altTexts };
    }

    return { urls: [], altTexts: [] };
  };

  // Extract video data from embed
  const getVideoData = () => {
    // Check main embed first
    if (post.embed) {
      // Handle Bluesky native video embeds (app.bsky.embed.video#view)
      if (post.embed.$type === 'app.bsky.embed.video#view' && post.embed.playlist) {
        return {
          videoUrl: post.embed.playlist,
          thumbnailUrl: post.embed.thumbnail,
          altText: post.embed.alt || t('common.video'),
          aspectRatio: post.embed.aspectRatio,
        };
      }

      // Handle legacy video embeds (app.bsky.embed.video)
      if (post.embed.video) {
        return {
          videoUrl: post.embed.video.ref.$link,
          thumbnailUrl: post.embed.video.ref.$link, // Use video URL as thumbnail for now
          altText: post.embed.video.alt || t('common.video'),
          aspectRatio: post.embed.aspectRatio,
        };
      }

      // Handle record with media embeds that might contain video
      if (post.embed.$type === 'app.bsky.embed.recordWithMedia#view' && post.embed.media) {
        if (post.embed.media.$type === 'app.bsky.embed.video#view' && post.embed.media.playlist) {
          return {
            videoUrl: post.embed.media.playlist,
            thumbnailUrl: post.embed.media.thumbnail,
            altText: post.embed.media.alt || t('common.video'),
            aspectRatio: post.embed.media.aspectRatio,
          };
        }
        if (post.embed.media.video) {
          return {
            videoUrl: post.embed.media.video.ref.$link,
            thumbnailUrl: post.embed.media.video.ref.$link,
            altText: post.embed.media.video.alt || t('common.video'),
            aspectRatio: post.embed.media.aspectRatio,
          };
        }
      }
    }

    // Check embeds array if main embed doesn't have video
    if (post.embeds && post.embeds.length > 0) {
      for (const embed of post.embeds) {
        // Handle Bluesky native video embeds (app.bsky.embed.video#view)
        if (embed.$type === 'app.bsky.embed.video#view' && embed.playlist) {
          return {
            videoUrl: embed.playlist,
            thumbnailUrl: embed.thumbnail,
            altText: embed.alt || t('common.video'),
            aspectRatio: embed.aspectRatio,
          };
        }

        if (embed.video) {
          return {
            videoUrl: embed.video.ref.$link,
            thumbnailUrl: embed.video.ref.$link,
            altText: embed.video.alt || t('common.video'),
            aspectRatio: embed.aspectRatio,
          };
        }

        // Handle record with media embeds in embeds array
        if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.media) {
          if (embed.media.$type === 'app.bsky.embed.video#view' && embed.media.playlist) {
            return {
              videoUrl: embed.media.playlist,
              thumbnailUrl: embed.media.thumbnail,
              altText: embed.media.alt || t('common.video'),
              aspectRatio: embed.media.aspectRatio,
            };
          }
          if (embed.media.video) {
            return {
              videoUrl: embed.media.video.ref.$link,
              thumbnailUrl: embed.media.video.ref.$link,
              altText: embed.media.video.alt || t('common.video'),
              aspectRatio: embed.media.aspectRatio,
            };
          }
        }
      }
    }

    return null;
  };

  const { urls: imageUrls, altTexts } = getImageData();
  const videoData = getVideoData();

  // Check if embed is a YouTube embed
  const isYouTubeEmbed = () => {
    // Check both embed and embeds fields
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData) {
      return false;
    }

    // Handle both "app.bsky.embed.external" and "app.bsky.embed.external#view"
    if (!embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return uri.includes('youtube.com') || uri.includes('youtu.be') || uri.includes('music.youtube.com');
  };

  // Check if embed is an external embed (non-YouTube, non-GIF)
  const isExternalEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return (
      !uri.includes('youtube.com') &&
      !uri.includes('youtu.be') &&
      !uri.includes('music.youtube.com') &&
      !uri.includes('tenor.com') &&
      !uri.includes('media.tenor.com') &&
      !uri.endsWith('.gif')
    );
  };

  // Check if embed is a GIF embed
  const isGifEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return uri.includes('tenor.com') || uri.includes('media.tenor.com') || uri.endsWith('.gif');
  };

  // Check if embed is a native video embed
  const isNativeVideoEmbed = () => {
    const result = videoData !== null;
    return result;
  };

  // Check if embed is an external video embed
  const isExternalVideoEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData) {
      return false;
    }

    // Check for external video embeds (non-YouTube)
    if (embedData.$type?.includes('app.bsky.embed.external')) {
      const uri = embedData.external?.uri || '';
      // Check if it's a video link but not YouTube
      const isVideoLink =
        uri.includes('vimeo.com') ||
        uri.includes('dailymotion.com') ||
        uri.includes('twitch.tv') ||
        uri.includes('tiktok.com') ||
        uri.includes('.mp4') ||
        uri.includes('.mov') ||
        uri.includes('.avi') ||
        uri.includes('.webm');

      return isVideoLink && !isYouTubeEmbed();
    }

    return false;
  };

  // Check if embed is a record embed (quoted post)
  const isRecordEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    return embedData?.$type === 'app.bsky.embed.record#view' && embedData.record;
  };

  // Check if embed is a record with media embed (quoted post with media)
  const isRecordWithMediaEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    return embedData?.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.record;
  };

  // Get the embed data for rendering external embeds
  const getEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return null;
    }
    return embedData as {
      $type: 'app.bsky.embed.external' | 'app.bsky.embed.external#view';
      external: {
        description: string;
        thumb?: {
          $type: 'blob';
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        title: string;
        uri: string;
      };
    };
  };

  // Get the embed data for rendering video embeds
  const getVideoEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData) {
      return null;
    }
    return embedData as {
      $type?: string;
      external?: {
        description: string;
        thumb?: {
          $type: 'blob';
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        title: string;
        uri: string;
      };
      media?: {
        $type: string;
        images?: BlueskyImage[];
        video?: {
          alt: string;
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
          aspectRatio?: {
            width: number;
            height: number;
          };
        };
      };
      videoUrl?: string;
      thumbnailUrl?: string;
      altText?: string;
      aspectRatio?: {
        width: number;
        height: number;
      };
    };
  };

  // Get the embed data for rendering record embeds
  const getRecordEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData || !embedData.record) {
      return null;
    }
    return embedData as {
      $type: 'app.bsky.embed.record#view' | 'app.bsky.embed.recordWithMedia#view';
      record: {
        uri: string;
        cid: string;
        author: {
          did: string;
          handle: string;
          displayName: string;
          avatar: string;
        };
        record: Record<string, unknown>;
        embed?: BlueskyEmbed;
        replyCount: number;
        repostCount: number;
        likeCount: number;
        indexedAt: string;
        viewer?: {
          like?: string;
          repost?: string;
          reply?: string;
        };
      };
      media?: BlueskyEmbed;
    };
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const postContent = (
    <>
      {/* Reply Context */}
      {post.replyTo && (
        <ThemedView style={styles.replyContext}>
          <IconSymbol name="arrowshape.turn.up.left" size={12} color={iconColor} style={styles.replyIcon} />
          <ThemedText style={styles.replyText}>
            Replying to <ThemedText style={styles.replyAuthor}>@{post.replyTo.author.handle}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.replyPreview} numberOfLines={1}>
            {post.replyTo.text}
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.header}>
        <ThemedView style={styles.authorSection}>
          <Image
            source={{
              uri: post.author.avatar || 'https://bsky.app/static/default-avatar.png',
            }}
            style={styles.authorAvatar}
            contentFit="cover"
            placeholder={require('@/assets/images/partial-react-logo.png')}
          />
          <ThemedView style={styles.authorInfo}>
            <ThemedText style={styles.displayName}>{post.author.displayName || post.author.handle}</ThemedText>
            <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
              <ThemedText style={styles.handle}>@{post.author.handle}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
        <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <RichTextWithFacets text={post.text || ''} facets={post.facets} style={styles.text} />

        {/* Render native video embed if present */}
        {(() => {
          const isNative = isNativeVideoEmbed();
          return isNative && videoData && <VideoEmbed embed={videoData} onClose={() => setSelectedImageIndex(null)} />;
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

        {/* Render images if present (should come before record embed for recordWithMedia) */}
        {imageUrls.length > 0 && (
          <ThemedView style={styles.imagesContainer}>
            {imageUrls.map((imageUrl: string, index: number) => {
              const dimensions = imageDimensions[imageUrl];
              const screenWidth = 400; // Approximate screen width minus padding
              const imageHeight = dimensions ? (dimensions.height / dimensions.width) * screenWidth : 300;

              return (
                <TouchableOpacity
                  key={`${post.id}-image-${index}`}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.image, { height: imageHeight }]}
                    contentFit="contain"
                    placeholder={require('@/assets/images/partial-react-logo.png')}
                    onLoad={(event) => handleImageLoad(imageUrl, event.source.width, event.source.height)}
                  />
                </TouchableOpacity>
              );
            })}
          </ThemedView>
        )}

        {/* Render record embed (quoted post) if present */}
        {(() => {
          const isRecord = isRecordEmbed();
          const isRecordWithMedia = isRecordWithMediaEmbed();
          const recordData = getRecordEmbedData();
          return (isRecord || isRecordWithMedia) && recordData && <RecordEmbed embed={recordData} />;
        })()}
      </ThemedView>

      {/* Labels */}
      <Labels labels={post.labels} maxLabels={3} />

      <ThemedView style={styles.interactions}>
        <TouchableOpacity style={styles.interactionItem} onPress={handleReplyPress} activeOpacity={0.7}>
          <IconSymbol name="bubble.left" size={16} color={iconColor} style={styles.interactionIcon} />
          <ThemedText style={styles.interactionCount}>{post.commentCount || 0}</ThemedText>
        </TouchableOpacity>
        <ThemedView style={styles.interactionItem}>
          <IconSymbol name="arrow.2.squarepath" size={16} color={iconColor} style={styles.interactionIcon} />
          <ThemedText style={styles.interactionCount}>{post.repostCount || 0}</ThemedText>
        </ThemedView>
        <TouchableOpacity style={styles.interactionItem} onPress={handleLikePress} activeOpacity={0.7}>
          <IconSymbol
            name={post.viewer?.like ? 'heart.fill' : 'heart'}
            size={16}
            color={post.viewer?.like ? '#ff3b30' : iconColor}
            style={styles.interactionIcon}
          />
          <ThemedText style={styles.interactionCount}>{post.likeCount || 0}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity
          style={[styles.container, { borderBottomColor: borderColor }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {postContent}
        </TouchableOpacity>
      ) : (
        <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>{postContent}</ThemedView>
      )}

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && imageUrls[selectedImageIndex] && (
        <ImageViewer
          visible={selectedImageIndex !== null}
          onClose={handleCloseImageViewer}
          imageUrl={imageUrls[selectedImageIndex]}
          altText={altTexts[selectedImageIndex]}
        />
      )}

      {/* Reply Composer Modal */}
      <PostComposer
        visible={showReplyComposer}
        onClose={() => setShowReplyComposer(false)}
        replyTo={{
          root: post.uri || '',
          parent: post.uri || '',
          authorHandle: post.author.handle,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  replyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  replyText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  replyPreview: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  handle: {
    fontSize: 14,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
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
  videoContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  interactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interactionIcon: {
    // IconSymbol handles its own sizing
  },
  interactionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
});
