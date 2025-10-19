import Hls, { Events } from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>('idle');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

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

  const handlePress = () => {
    setShouldShowVideo(true);
    setPlayerStatus('loading');
    setPlayerError(null);
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
        setPlayerStatus('loading');
        setPlayerError(null);

        if (isHLS) {
          // Use hls.js for HLS streams
          if (Hls.isSupported()) {
            hlsRef.current = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hlsRef.current.loadSource(playbackUrl);
            hlsRef.current.attachMedia(video);

            hlsRef.current.on(Events.MANIFEST_PARSED, () => {
              setPlayerStatus('readyToPlay');
            });

            hlsRef.current.on(Events.ERROR, (event, data) => {
              console.error('HLS Error:', data);
              setPlayerStatus('error');
              setPlayerError(`HLS Error: ${data.details}`);
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = playbackUrl;
            video.addEventListener('loadedmetadata', () => {
              setPlayerStatus('readyToPlay');
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
          setPlayerStatus('error');
          setPlayerError('Failed to load video');
        };

        const handleLoadedMetadata = () => {
          setPlayerStatus('readyToPlay');
        };

        video.addEventListener('error', handleVideoError);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
          video.removeEventListener('error', handleVideoError);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      } catch (error) {
        setPlayerStatus('error');
        setPlayerError(`Failed to initialize video: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Reset state when a new video URL is provided
  useEffect(() => {
    setShouldShowVideo(false);
    setPlaybackUrl(null);
    setPlayerStatus('idle');
    setPlayerError(null);
    setIsResolvingUrl(false);
  }, [videoUrl]);

  // Resolve Bluesky playlist URLs only when video playback is requested
  useEffect(() => {
    if (!shouldShowVideo) {
      return;
    }

    if (!videoUrl || videoUrl.trim() === '') {
      setPlaybackUrl(null);
      return;
    }

    const needsResolution = videoUrl.includes('video.bsky.app') && videoUrl.includes('playlist.m3u8');

    if (!needsResolution) {
      setPlaybackUrl(videoUrl);
      setIsResolvingUrl(false);
      return;
    }

    let isCancelled = false;

    setIsResolvingUrl(true);

    resolveBlueskyVideoUrl(videoUrl)
      .then((resolvedUrl) => {
        if (isCancelled) {
          return;
        }

        setPlaybackUrl(resolvedUrl || videoUrl);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setPlaybackUrl(videoUrl);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsResolvingUrl(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [shouldShowVideo, videoUrl]);

  // Show error state
  if (playerStatus === 'error') {
    return (
      <ThemedCard style={styles.container}>
        <ThemedView
          style={[styles.videoContainer, { aspectRatio: aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9 }]}
        >
          <TouchableOpacity
            onPress={() => {
              setPlayerStatus('idle');
              setPlayerError(null);
              setShouldShowVideo(false);
              setPlaybackUrl(null);
              setIsResolvingUrl(false);
            }}
          >
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={[styles.errorText, { color: textColor }]}>
                {playerError && playerError.trim() ? playerError : 'Failed to load video'}
              </ThemedText>
              <ThemedText style={[styles.retryText, { color: secondaryTextColor }]}>{t('ui.tapToRetry')}</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      </ThemedCard>
    );
  }

  if (shouldShowVideo && playbackUrl) {
    const videoAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

    return (
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.videoContainer, { aspectRatio: videoAspectRatio }]}>
          <video
            ref={videoRef}
            style={styles.video}
            controls={showControls}
            muted={muted}
            loop={loop}
            autoPlay={autoplay}
            poster={thumbnailUrl || ''}
            src={!playbackUrl.includes('.m3u8') ? playbackUrl : undefined}
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

  // Fallback thumbnail with play button
  const thumbnailAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} disabled={isResolvingUrl}>
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.thumbnailContainer, { aspectRatio: thumbnailAspectRatio }]}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title || 'Video thumbnail'} style={styles.thumbnail as any} />
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
