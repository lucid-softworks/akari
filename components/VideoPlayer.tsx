import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

type VideoPlayerProps = {
  /** Video URL to play */
  videoUrl: string;
  /** Thumbnail URL for the video */
  thumbnailUrl?: string;
  /** Video title */
  title?: string;
  /** Video description */
  description?: string;
  /** Whether to show controls */
  showControls?: boolean;
  /** Whether the video is autoplay */
  autoplay?: boolean;
  /** Whether the video is muted */
  muted?: boolean;
  /** Whether the video is looping */
  loop?: boolean;
  /** Video aspect ratio */
  aspectRatio?: {
    width: number;
    height: number;
  };
};

/**
 * Video player component with native video support using expo-video
 * Falls back to thumbnail with play button if video URL is invalid
 */
export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  description,
  showControls = true,
  autoplay = false,
  muted = true,
  loop = false,
  aspectRatio,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoSupport, setHasVideoSupport] = useState(false);

  const textColor = useThemeColor(
    {
      light: "#000000",
      dark: "#ffffff",
    },
    "text"
  );

  const secondaryTextColor = useThemeColor(
    {
      light: "#666666",
      dark: "#999999",
    },
    "text"
  );

  // Initialize video player with expo-video
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = loop;
    player.muted = muted;
    if (autoplay) {
      player.play();
    }
  });

  // Get playing state from video player
  const { isPlaying: videoIsPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const handlePress = () => {
    if (hasVideoSupport && player) {
      if (videoIsPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  // Check if we have a valid video URL and can use native video
  useState(() => {
    if (videoUrl && videoUrl.trim() !== "") {
      setHasVideoSupport(true);
    }
  });

  if (hasVideoSupport && player) {
    // Calculate aspect ratio
    const videoAspectRatio = aspectRatio
      ? aspectRatio.width / aspectRatio.height
      : 16 / 9;

    // Native video player implementation
    return (
      <ThemedCard style={styles.container}>
        <ThemedView
          style={[styles.videoContainer, { aspectRatio: videoAspectRatio }]}
        >
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
        </ThemedView>

        {showControls && (title || description) && (
          <ThemedView style={styles.content}>
            {title && (
              <ThemedText
                style={[styles.title, { color: textColor }]}
                numberOfLines={2}
              >
                {title}
              </ThemedText>
            )}
            {description && (
              <ThemedText
                style={[styles.description, { color: secondaryTextColor }]}
                numberOfLines={2}
              >
                {description}
              </ThemedText>
            )}
            <ThemedText style={[styles.source, { color: secondaryTextColor }]}>
              Video
            </ThemedText>
          </ThemedView>
        )}
      </ThemedCard>
    );
  }

  // Fallback: thumbnail with play button
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <ThemedCard style={styles.container}>
        <ThemedView style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              placeholder={require("@/assets/images/partial-react-logo.png")}
            />
          ) : (
            <ThemedView style={styles.placeholderContainer}>
              <ThemedText style={styles.placeholderIcon}>🎥</ThemedText>
            </ThemedView>
          )}
          <ThemedView style={styles.playButton}>
            <ThemedText style={styles.playIcon}>▶️</ThemedText>
          </ThemedView>
        </ThemedView>

        {(title || description) && (
          <ThemedView style={styles.content}>
            {title && (
              <ThemedText
                style={[styles.title, { color: textColor }]}
                numberOfLines={2}
              >
                {title}
              </ThemedText>
            )}
            {description && (
              <ThemedText
                style={[styles.description, { color: secondaryTextColor }]}
                numberOfLines={2}
              >
                {description}
              </ThemedText>
            )}
            <ThemedText style={[styles.source, { color: secondaryTextColor }]}>
              Video
            </ThemedText>
          </ThemedView>
        )}
      </ThemedCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  videoContainer: {
    width: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  thumbnailContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    fontSize: 16,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  source: {
    fontSize: 12,
    marginTop: 4,
  },
});
