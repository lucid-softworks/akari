import { useEffect, useReducer, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Video from 'react-native-video';

import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedView } from '@/components/ThemedView';

import { VideoPlayer as WebVideoPlayer } from './VideoPlayer.web';
import { ErrorOverlay } from './VideoPlayer/ErrorOverlay';
import { ThumbnailView } from './VideoPlayer/ThumbnailView';
import { VideoCaption } from './VideoPlayer/VideoCaption';
import { getNativeVideoSource } from './VideoPlayer/getNativeVideoSource';
import {
  INITIAL_NATIVE_PLAYER_STATE,
  nativePlayerReducer,
} from './VideoPlayer/nativePlayerReducer';

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
  // Co-locate player lifecycle fields. Every transition (press, resolve,
  // load, error, end) touches more than one of these, so per-field
  // setters were both noisy and cascading. A reducer keeps each
  // transition to a single dispatch call.
  const [playerState, dispatch] = useReducer(nativePlayerReducer, INITIAL_NATIVE_PLAYER_STATE);
  const {
    playerStatus,
    playerError,
    shouldShowVideo,
    isPlaying,
    playbackUrl,
    isResolvingUrl,
  } = playerState;
  const videoRef = useRef<any>(null);

  // Calculate video source. react-native-video auto-detects the type
  // for both HLS and other formats, so we just hand it the URI.
  const videoSource = getNativeVideoSource(playbackUrl);

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
      <ErrorOverlay
        message={playerError}
        aspectRatio={aspectRatio}
        onRetry={() => dispatch({ type: 'reset' })}
      />
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

        {showControls ? <VideoCaption title={title} description={description} /> : null}
      </ThemedCard>
    );
  }

  return (
    <ThumbnailView
      thumbnailUrl={thumbnailUrl}
      title={title}
      description={description}
      aspectRatio={aspectRatio}
      disabled={isResolvingUrl}
      onPress={handlePress}
    />
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
});
