import { Image } from '@/components/Image';
import { useEffect, useReducer, useRef } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Video from 'react-native-video';

import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import { VideoPlayer as WebVideoPlayer } from './VideoPlayer.web';

type PlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

type PlayerState = {
  playerStatus: PlayerStatus;
  playerError: string | null;
  shouldShowVideo: boolean;
  isPlaying: boolean;
  playbackUrl: string | null;
  isResolvingUrl: boolean;
};

type PlayerAction =
  | { type: 'press' }
  | { type: 'resolveCleared' }
  | { type: 'resolveSettled'; playbackUrl: string | null }
  | { type: 'resolveStart' }
  | { type: 'loadStart' }
  | { type: 'loaded' }
  | { type: 'playing' }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

const INITIAL_PLAYER_STATE: PlayerState = {
  playerStatus: 'idle',
  playerError: null,
  shouldShowVideo: false,
  isPlaying: false,
  playbackUrl: null,
  isResolvingUrl: false,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'press':
      return { ...state, shouldShowVideo: true, playerStatus: 'loading' };
    case 'resolveCleared':
      return { ...state, playbackUrl: null };
    case 'resolveSettled':
      return { ...state, playbackUrl: action.playbackUrl, isResolvingUrl: false };
    case 'resolveStart':
      return { ...state, isResolvingUrl: true };
    case 'loadStart':
      return { ...state, playerStatus: 'loading', playerError: null };
    case 'loaded':
      return { ...state, playerStatus: 'readyToPlay', playerError: null };
    case 'playing':
      return { ...state, isPlaying: true };
    case 'ended':
      return { ...state, isPlaying: false };
    case 'error':
      return { ...state, playerStatus: 'error', playerError: action.message };
    case 'reset':
      return INITIAL_PLAYER_STATE;
  }
}

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
 * Uses web-specific implementation on web platform
 */
export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  description,
  showControls = true,
  autoplay = false,
  muted = false,
  loop = false,
  aspectRatio,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  // Co-locate player lifecycle fields. Every transition (press, resolve,
  // load, error, end) touches more than one of these, so per-field
  // setters were both noisy and cascading. A reducer keeps each
  // transition to a single dispatch call.
  const [playerState, dispatch] = useReducer(playerReducer, INITIAL_PLAYER_STATE);
  const {
    playerStatus,
    playerError,
    shouldShowVideo,
    isPlaying,
    playbackUrl,
    isResolvingUrl,
  } = playerState;
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
    if (!playbackUrl || playbackUrl.trim() === '') {
      return null;
    }

    // Validate URL format (constructor throws on invalid input)
    try {
      const _validated = new URL(playbackUrl);
      void _validated;
    } catch {
      return null;
    }

    // Check if it's an HLS stream
    if (playbackUrl.includes('.m3u8')) {
      return {
        uri: playbackUrl,
        // Try without explicit type to let react-native-video auto-detect
      };
    }

    // For other video formats, let react-native-video auto-detect
    return {
      uri: playbackUrl,
    };
  };

  // Calculate video source
  const videoSource = getVideoSource();

  // Auto-play when player becomes ready and should show video
  useEffect(() => {
    if (shouldShowVideo && playerStatus === 'readyToPlay' && videoRef.current) {
      const timeoutId = setTimeout(() => {
        videoRef.current?.seek(0);
        dispatch({ type: 'playing' });
      }, 100); // Small delay to ensure player is ready
      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowVideo, playerStatus]);

  // Add timeout for video loading
  useEffect(() => {
    if (shouldShowVideo && playerStatus === 'loading' && videoSource) {
      const timeoutId = setTimeout(() => {
        dispatch({ type: 'error', message: 'Video loading timeout' });
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowVideo, playerStatus, videoSource]);

  const handlePress = () => {
    // Show the video player when clicking the thumbnail
    dispatch({ type: 'press' });
  };

  // Resetting on videoUrl change is handled by the parent passing `key={videoUrl}`
  // to remount this component, which gives us a clean state slate.

  // Lazily resolve Bluesky playlist URLs only when the user chooses to play the video
  useEffect(() => {
    if (!shouldShowVideo) {
      return;
    }

    if (!videoUrl || videoUrl.trim() === '') {
      dispatch({ type: 'resolveCleared' });
      return;
    }

    const needsResolution = videoUrl.includes('video.bsky.app') && videoUrl.includes('playlist.m3u8');

    if (!needsResolution) {
      dispatch({ type: 'resolveSettled', playbackUrl: videoUrl });
      return;
    }

    let isCancelled = false;

    dispatch({ type: 'resolveStart' });

    resolveBlueskyVideoUrl(videoUrl)
      .then((resolvedUrl) => {
        if (isCancelled) return undefined;
        dispatch({ type: 'resolveSettled', playbackUrl: resolvedUrl || videoUrl });
        return undefined;
      })
      .catch(() => {
        if (isCancelled) return;
        dispatch({ type: 'resolveSettled', playbackUrl: videoUrl });
      });

    return () => {
      isCancelled = true;
    };
  }, [shouldShowVideo, videoUrl]);

  const handleLoadStart = () => {
    dispatch({ type: 'loadStart' });
  };

  const handleLoad = (_data: any) => {
    dispatch({ type: 'loaded' });
  };

  const handleProgress = (_data: any) => {
    // Progress updates handled silently
  };

  const handleBuffer = (_data: any) => {
    // Buffer updates handled silently
  };

  const handleError = (error: any) => {
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

    dispatch({ type: 'error', message: `Failed to load video: ${errorMessage}` });

    // Reset to thumbnail view on error after delay
    setTimeout(() => {
      dispatch({ type: 'reset' });
    }, 5000); // Increased timeout to 5 seconds
  };

  const handleEnd = () => {
    dispatch({ type: 'ended' });
  };

  // On web platform, use web-specific implementation
  if (Platform.OS === 'web' && WebVideoPlayer) {
    return (
      <WebVideoPlayer
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        title={title}
        description={description}
        showControls={showControls}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        aspectRatio={aspectRatio}
      />
    );
  }

  // Show error state
  if (playerStatus === 'error') {
    return (
      <ThemedCard style={styles.container}>
        <ThemedView
          style={[
            styles.videoContainer,
            {
              aspectRatio: aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              // Reset and retry
              dispatch({ type: 'reset' });
            }} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={[styles.errorText, { color: textColor }]}>
                {playerError && playerError.trim() ? playerError : 'Failed to load video'}
              </ThemedText>
              <ThemedText style={[styles.retryText, { color: secondaryTextColor }]}>{t('ui.tapToRetry')}</ThemedText>
            </ThemedView>
          </Pressable>
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
  const thumbnailAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;
  return (
    <Pressable onPress={handlePress}  disabled={isResolvingUrl} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.thumbnailContainer, { aspectRatio: thumbnailAspectRatio }]}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              contentFit="cover"
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
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
