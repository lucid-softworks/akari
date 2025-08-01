import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Video from 'react-native-video';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

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
 * Video player component with native video support using react-native-video
 * Supports HLS streams and direct video URLs
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
  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>('idle');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<any>(null);

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

  // Determine content type for HLS streams
  const getVideoSource = () => {
    if (!videoUrl || videoUrl.trim() === '') {
      return null;
    }

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch {
      return null;
    }

    // Check if it's an HLS stream
    if (videoUrl.includes('.m3u8')) {
      return {
        uri: videoUrl,
        // Try without explicit type to let react-native-video auto-detect
      };
    }

    // For other video formats, let react-native-video auto-detect
    return {
      uri: videoUrl,
    };
  };

  // Calculate video source
  const videoSource = getVideoSource();

  // Auto-play when player becomes ready and should show video
  useEffect(() => {
    if (shouldShowVideo && playerStatus === 'readyToPlay' && videoRef.current) {
      setTimeout(() => {
        videoRef.current?.seek(0);
        setIsPlaying(true);
      }, 100); // Small delay to ensure player is ready
    }
  }, [shouldShowVideo, playerStatus]);

  // Add timeout for video loading
  useEffect(() => {
    if (shouldShowVideo && playerStatus === 'loading' && videoSource) {
      const timeoutId = setTimeout(() => {
        setPlayerStatus('error');
        setPlayerError('Video loading timeout');
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowVideo, playerStatus, videoSource]);

  const handlePress = () => {
    if (shouldShowVideo && playerStatus === 'readyToPlay' && videoRef.current) {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        videoRef.current.seek(0);
        setIsPlaying(true);
      }
    } else {
      // Show the video player when clicking the thumbnail
      setShouldShowVideo(true);
      setPlayerStatus('loading'); // Set loading state immediately
    }
  };

  const handleLoadStart = () => {
    setPlayerStatus('loading');
    setPlayerError(null);
  };

  const handleLoad = (data: any) => {
    setPlayerStatus('readyToPlay');
    setPlayerError(null);
  };

  const handleProgress = (data: any) => {
    // Progress updates handled silently
  };

  const handleBuffer = (data: any) => {
    // Buffer updates handled silently
  };

  const handleError = (error: any) => {
    setPlayerStatus('error');
    let errorMessage = 'Unknown error';

    try {
      errorMessage =
        error?.error?.localizedDescription ||
        error?.error?.code ||
        error?.error?.message ||
        (typeof error === 'string' ? error : 'Unknown error');
    } catch {
      errorMessage = 'Unknown error';
    }

    setPlayerError(`Failed to load video: ${errorMessage}`);

    // Reset to thumbnail view on error after delay
    setTimeout(() => {
      setShouldShowVideo(false);
      setPlayerStatus('idle');
      setPlayerError(null);
    }, 5000); // Increased timeout to 5 seconds
  };

  const handleEnd = () => {
    setIsPlaying(false);
  };

  // Show error state
  if (playerStatus === 'error') {
    return (
      <ThemedCard style={styles.container}>
        <ThemedView
          style={[styles.videoContainer, { aspectRatio: aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9 }]}
        >
          <TouchableOpacity
            onPress={() => {
              // Reset and retry
              setPlayerStatus('idle');
              setPlayerError(null);
              setShouldShowVideo(false);
            }}
          >
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={[styles.errorText, { color: textColor }]}>
                {playerError && playerError.trim() ? playerError : 'Failed to load video'}
              </ThemedText>
              <ThemedText style={[styles.retryText, { color: secondaryTextColor }]}>Tap to retry</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      </ThemedCard>
    );
  }

  // Show video player when user clicked to show video
  if (shouldShowVideo && videoSource) {
    // Calculate aspect ratio
    const videoAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

    return (
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.videoContainer, { aspectRatio: videoAspectRatio }]}>
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode="contain"
            repeat={loop}
            muted={muted}
            paused={!isPlaying}
            controls={showControls}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onError={handleError}
            onEnd={handleEnd}
            onProgress={handleProgress}
            onBuffer={handleBuffer}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            progressUpdateInterval={1000}
            useTextureView={false}
            textTracks={[]}
            automaticallyWaitsToMinimizeStalling={true}
            poster={thumbnailUrl}
            posterResizeMode="cover"
          />
        </ThemedView>

        {showControls &&
          (() => {
            const hasTitle = title && typeof title === 'string' && title.trim().length > 0;
            const hasDescription = description && typeof description === 'string' && description.trim().length > 0;

            if (!hasTitle && !hasDescription) {
              return null;
            }

            return (
              <ThemedView style={styles.content}>
                {hasTitle && (
                  <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
                    {title}
                  </ThemedText>
                )}
                {hasDescription && (
                  <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
                    {description}
                  </ThemedText>
                )}
              </ThemedView>
            );
          })()}
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
              placeholder={require('@/assets/images/partial-react-logo.png')}
              transition={200}
            />
          ) : (
            <ThemedView style={styles.placeholderContainer}>
              <ThemedText style={styles.placeholderIcon}>📹</ThemedText>
            </ThemedView>
          )}
          <ThemedView style={styles.playButton}>
            <ThemedText style={styles.playIcon}>▶</ThemedText>
          </ThemedView>
        </ThemedView>

        {(() => {
          const hasTitle = title && typeof title === 'string' && title.trim().length > 0;
          const hasDescription = description && typeof description === 'string' && description.trim().length > 0;

          if (!hasTitle && !hasDescription) {
            return null;
          }

          return (
            <ThemedView style={styles.content}>
              {hasTitle ? (
                <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
                  {title}
                </ThemedText>
              ) : null}
              {hasDescription ? (
                <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
                  {description}
                </ThemedText>
              ) : null}
            </ThemedView>
          );
        })()}
      </ThemedCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoContainer: {
    width: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
    color: 'white',
  },
  content: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
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
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  retryText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
