import Hls, { Events } from 'hls.js';
import { useEffect, useReducer, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedView } from '@/components/ThemedView';

import { ErrorOverlay } from './VideoPlayer/ErrorOverlay.web';
import { ThumbnailView } from './VideoPlayer/ThumbnailView.web';
import { VideoCaption } from './VideoPlayer/VideoCaption.web';
import { INITIAL_WEB_PLAYER_STATE, webPlayerReducer } from './VideoPlayer/webPlayerReducer';

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
 * Web-specific video player component using hls.js for HLS streams
 * Falls back to native HTML5 video for other formats
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
  const [state, dispatch] = useReducer(webPlayerReducer, INITIAL_WEB_PLAYER_STATE);
  const { playerStatus, playerError, shouldShowVideo, playbackUrl, isResolvingUrl } = state;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const handlePress = () => {
    dispatch({ type: 'press' });
  };

  // Add global error handler for abort errors
  useEffect(() => {
    const handleAbortError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('fetching process for the media resource was aborted')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleAbortError);
    return () => window.removeEventListener('error', handleAbortError);
  }, []);

  // Initialize HLS player
  useEffect(() => {
    if (!shouldShowVideo || !playbackUrl || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const isHLS = playbackUrl.includes('.m3u8');

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initializeVideo = () => {
      try {
        dispatch({ type: 'initStart' });

        if (isHLS) {
          // Use hls.js for HLS streams
          // oxlint-disable-next-line import/no-named-as-default-member -- hls.js exposes isSupported only as a static method on the default-exported class
          if (Hls.isSupported()) {
            hlsRef.current = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hlsRef.current.loadSource(playbackUrl);
            hlsRef.current.attachMedia(video);

            hlsRef.current.on(Events.MANIFEST_PARSED, () => {
              dispatch({ type: 'loaded' });
            });

            hlsRef.current.on(Events.ERROR, (event, data) => {
              console.error('HLS Error:', data);
              dispatch({ type: 'error', message: `HLS Error: ${data.details}` });
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = playbackUrl;
            video.addEventListener('loadedmetadata', () => {
              dispatch({ type: 'loaded' });
            });
          } else {
            throw new Error('HLS is not supported in this browser');
          }
        } else {
          // Regular video format
          video.src = playbackUrl;
        }

        const handleVideoError = (event: Event) => {
          // Ignore abort errors (they're normal when pausing)
          if (event.target && (event.target as any).error && (event.target as any).error.code === 20) {
            console.log('Abort error (ignored):', event);
            return;
          }
          console.error('Video error:', event);
          dispatch({ type: 'error', message: 'Failed to load video' });
        };

        const handleLoadedMetadata = () => {
          dispatch({ type: 'loaded' });
        };

        video.addEventListener('error', handleVideoError);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
          video.removeEventListener('error', handleVideoError);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      } catch (error) {
        dispatch({
          type: 'error',
          message: `Failed to initialize video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    };

    const cleanup = initializeVideo();

    // Cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl, shouldShowVideo]);

  // The video only mounts after the user taps the thumbnail (an explicit
  // gesture), so start playback as soon as it's ready rather than making
  // them press the native play button too. The tap is the activating
  // gesture, so this is allowed; if the browser's autoplay policy still
  // rejects it, the visible controls let the user start it manually.
  useEffect(() => {
    if (playerStatus !== 'readyToPlay') return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {});
  }, [playerStatus]);

  // Resetting on videoUrl change is handled by the parent passing `key={videoUrl}`
  // to remount this component, which gives us a clean state slate.

  // Resolve Bluesky playlist URLs only when video playback is requested
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

  if (shouldShowVideo && playbackUrl) {
    const videoAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

    return (
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.videoContainer, { aspectRatio: videoAspectRatio }]}>
          {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded atproto video has no caption track in the lexicon */}
          <video
            ref={videoRef}
            style={styles.video}
            controls={showControls}
            muted={muted}
            loop={loop}
            autoPlay={autoplay}
            poster={thumbnailUrl || ''}
            src={!playbackUrl.includes('.m3u8') ? playbackUrl : undefined}
            aria-label={title && typeof title === 'string' && title.trim().length > 0 ? title : 'Video'}
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
    objectFit: 'contain',
  },
});
