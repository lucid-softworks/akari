import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ExternalEmbed } from "@/components/ExternalEmbed";
import { ImageViewer } from "@/components/ImageViewer";
import { Labels } from "@/components/Labels";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { VideoEmbed } from "@/components/VideoEmbed";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTranslation } from "@/hooks/useTranslation";

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
    embed?: any;
    embeds?: any[]; // Added embeds field
    /** Reply context - what this post is replying to */
    replyTo?: {
      author: {
        handle: string;
        displayName?: string;
      };
      text: string;
    };
    /** Labels applied to the post */
    labels?: {
      val: string;
      src: string;
      cts: string;
      uri: string;
      cid?: string;
      neg?: boolean;
      value?: string;
      text?: string;
      label?: string;
      ver?: number;
      exp?: string;
    }[];
  };
  onPress?: () => void;
};

export function PostCard({ post, onPress }: PostCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const { t } = useTranslation();

  const borderColor = useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );

  const handleProfilePress = () => {
    router.push(`/profile/${encodeURIComponent(post.author.handle)}`);
  };

  const handleImageLoad = (imageUrl: string, width: number, height: number) => {
    setImageDimensions((prev) => ({
      ...prev,
      [imageUrl]: { width, height },
    }));
  };

  // Extract image URLs and alt text from embed data
  const getImageData = () => {
    if (!post.embed) return { urls: [], altTexts: [] };

    // Handle different embed types
    if (post.embed.$type === "app.bsky.embed.images") {
      // Filter out video files, only show actual images
      const imageFiles =
        post.embed.images?.filter(
          (img: any) => !img.mimeType || !img.mimeType.startsWith("video/")
        ) || [];

      const urls = imageFiles.map((img: any) => img.fullsize) || [];
      const altTexts = imageFiles.map((img: any) => img.alt) || [];
      return { urls, altTexts };
    }

    // Handle other embed types that might contain images
    if (post.embed.images) {
      // Filter out video files, only show actual images
      const imageFiles = post.embed.images.filter(
        (img: any) => !img.mimeType || !img.mimeType.startsWith("video/")
      );

      const urls = imageFiles.map((img: any) => img.fullsize);
      const altTexts = imageFiles.map((img: any) => img.alt);
      return { urls, altTexts };
    }

    return { urls: [], altTexts: [] };
  };

  // Extract video data from embed
  const getVideoData = () => {
    if (!post.embed) return null;

    // Handle Bluesky native video embeds
    if (post.embed.$type === "app.bsky.embed.video" && post.embed.video) {
      return {
        videoUrl: post.embed.video.ref?.$link,
        thumbnailUrl: post.embed.video.ref?.$link, // Use video URL as thumbnail for now
        altText: post.embed.video.alt || t("common.video"),
        aspectRatio: post.embed.aspectRatio,
      };
    }

    // Handle image embeds that might contain videos
    if (
      post.embed.$type === "app.bsky.embed.images#view" &&
      post.embed.images
    ) {
      // Check if any of the images are actually videos
      const videoImages = post.embed.images.filter(
        (img: any) => img.mimeType && img.mimeType.startsWith("video/")
      );

      if (videoImages.length > 0) {
        return {
          videoUrl: videoImages[0].fullsize,
          thumbnailUrl: videoImages[0].thumb,
          altText: videoImages[0].alt,
        };
      }
    }

    // Handle record with media embeds that might contain video
    if (
      post.embed.$type === "app.bsky.embed.recordWithMedia#view" &&
      post.embed.media
    ) {
      if (
        post.embed.media.$type === "app.bsky.embed.images#view" &&
        post.embed.media.images
      ) {
        const videoImages = post.embed.media.images.filter(
          (img: any) => img.mimeType && img.mimeType.startsWith("video/")
        );

        if (videoImages.length > 0) {
          return {
            videoUrl: videoImages[0].fullsize,
            thumbnailUrl: videoImages[0].thumb,
            altText: videoImages[0].alt,
          };
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
    if (!embedData.$type?.includes("app.bsky.embed.external")) {
      return false;
    }

    const uri = embedData.external?.uri || "";
    return (
      uri.includes("youtube.com") ||
      uri.includes("youtu.be") ||
      uri.includes("music.youtube.com")
    );
  };

  // Check if embed is an external embed (non-YouTube)
  const isExternalEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData || !embedData.$type?.includes("app.bsky.embed.external")) {
      return false;
    }

    const uri = embedData.external?.uri || "";
    return (
      !uri.includes("youtube.com") &&
      !uri.includes("youtu.be") &&
      !uri.includes("music.youtube.com")
    );
  };

  // Check if embed is a native video embed
  const isNativeVideoEmbed = () => {
    return videoData !== null;
  };

  // Check if embed is an external video embed
  const isExternalVideoEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData) {
      return false;
    }

    // Check for external video embeds (non-YouTube)
    if (embedData.$type?.includes("app.bsky.embed.external")) {
      const uri = embedData.external?.uri || "";
      // Check if it's a video link but not YouTube
      const isVideoLink =
        uri.includes("vimeo.com") ||
        uri.includes("dailymotion.com") ||
        uri.includes("twitch.tv") ||
        uri.includes("tiktok.com") ||
        uri.includes(".mp4") ||
        uri.includes(".mov") ||
        uri.includes(".avi") ||
        uri.includes(".webm");

      return isVideoLink && !isYouTubeEmbed();
    }

    return false;
  };

  // Get the embed data for rendering
  const getEmbedData = () => {
    return post.embed || (post.embeds && post.embeds[0]);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { borderBottomColor: borderColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Reply Context */}
        {post.replyTo && (
          <ThemedView style={styles.replyContext}>
            <ThemedText style={styles.replyIcon}>↩️</ThemedText>
            <ThemedText style={styles.replyText}>
              Replying to{" "}
              <ThemedText style={styles.replyAuthor}>
                @{post.replyTo.author.handle}
              </ThemedText>
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
                uri:
                  post.author.avatar ||
                  "https://bsky.app/static/default-avatar.png",
              }}
              style={styles.authorAvatar}
              contentFit="cover"
              placeholder={require("@/assets/images/partial-react-logo.png")}
            />
            <ThemedView style={styles.authorInfo}>
              <ThemedText style={styles.displayName}>
                {post.author.displayName || post.author.handle}
              </ThemedText>
              <TouchableOpacity
                onPress={handleProfilePress}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.handle}>
                  @{post.author.handle}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
          <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={styles.text}>{post.text}</ThemedText>

          {/* Render YouTube embed if present */}
          {isYouTubeEmbed() && <YouTubeEmbed embed={getEmbedData()} />}

          {/* Render external embed if present (non-YouTube) */}
          {isExternalEmbed() && <ExternalEmbed embed={getEmbedData()} />}

          {/* Render native video embed if present */}
          {isNativeVideoEmbed() && videoData && (
            <VideoEmbed
              embed={videoData}
              onClose={() => setSelectedImageIndex(null)}
            />
          )}

          {/* Render external video embed if present */}
          {isExternalVideoEmbed() && <VideoEmbed embed={getEmbedData()} />}

          {/* Render images if present */}
          {imageUrls.length > 0 && (
            <ThemedView style={styles.imagesContainer}>
              {imageUrls.map((imageUrl: string, index: number) => {
                const dimensions = imageDimensions[imageUrl];
                const screenWidth = 400; // Approximate screen width minus padding
                const imageHeight = dimensions
                  ? (dimensions.height / dimensions.width) * screenWidth
                  : 300;

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
                      placeholder={require("@/assets/images/partial-react-logo.png")}
                      onLoad={(event) =>
                        handleImageLoad(
                          imageUrl,
                          event.source.width,
                          event.source.height
                        )
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          )}
        </ThemedView>

        {/* Labels */}
        <Labels labels={post.labels} maxLabels={3} />

        <ThemedView style={styles.interactions}>
          <ThemedView style={styles.interactionItem}>
            <ThemedText style={styles.interactionIcon}>💬</ThemedText>
            <ThemedText style={styles.interactionCount}>
              {post.commentCount || 0}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.interactionItem}>
            <ThemedText style={styles.interactionIcon}>🔄</ThemedText>
            <ThemedText style={styles.interactionCount}>
              {post.repostCount || 0}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.interactionItem}>
            <ThemedText style={styles.interactionIcon}>❤️</ThemedText>
            <ThemedText style={styles.interactionCount}>
              {post.likeCount || 0}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && imageUrls[selectedImageIndex] && (
        <ImageViewer
          visible={selectedImageIndex !== null}
          onClose={handleCloseImageViewer}
          imageUrl={imageUrls[selectedImageIndex]}
          altText={altTexts[selectedImageIndex]}
        />
      )}
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    opacity: 0.8,
  },
  replyPreview: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: "italic",
    flex: 1,
    marginLeft: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontWeight: "600",
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
    width: "100%",
    borderRadius: 8,
  },
  videoContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholder: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  interactions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  interactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  interactionIcon: {
    fontSize: 16,
  },
  interactionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
});
