import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ImageViewer } from "@/components/ImageViewer";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

type PostCardProps = {
  post: {
    id: string;
    text: string;
    author: {
      handle: string;
      displayName?: string;
    };
    createdAt: string;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
    embed?: any;
  };
  onPress?: () => void;
};

export function PostCard({ post, onPress }: PostCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

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

  // Extract image URLs and alt text from embed data
  const getImageData = () => {
    if (!post.embed) return { urls: [], altTexts: [] };

    // Handle different embed types
    if (post.embed.$type === "app.bsky.embed.images") {
      const urls = post.embed.images?.map((img: any) => img.fullsize) || [];
      const altTexts = post.embed.images?.map((img: any) => img.alt) || [];
      return { urls, altTexts };
    }

    // Handle other embed types that might contain images
    if (post.embed.images) {
      const urls = post.embed.images.map((img: any) => img.fullsize);
      const altTexts = post.embed.images.map((img: any) => img.alt);
      return { urls, altTexts };
    }

    return { urls: [], altTexts: [] };
  };

  const { urls: imageUrls, altTexts } = getImageData();

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
        <ThemedView style={styles.header}>
          <ThemedView style={styles.authorInfo}>
            <ThemedText style={styles.displayName}>
              {post.author.displayName || post.author.handle}
            </ThemedText>
            <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
              <ThemedText style={styles.handle}>
                @{post.author.handle}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={styles.text}>{post.text}</ThemedText>

          {/* Render images if present */}
          {imageUrls.length > 0 && (
            <ThemedView style={styles.imagesContainer}>
              {imageUrls.map((imageUrl: string, index: number) => (
                <TouchableOpacity
                  key={`${post.id}-image-${index}`}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    placeholder={require("@/assets/images/partial-react-logo.png")}
                  />
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
    aspectRatio: 16 / 9,
    borderRadius: 8,
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
