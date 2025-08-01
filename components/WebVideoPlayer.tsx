import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

type WebVideoPlayerProps = {
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
  /** Callback when video starts loading */
  onLoadStart?: () => void;
  /** Callback when video is loaded */
  onLoad?: (data: any) => void;
  /** Callback when video encounters an error */
  onError?: (error: any) => void;
  /** Callback when video ends */
  onEnd?: () => void;
  /** Callback when video progress updates */
  onProgress?: (data: any) => void;
  /** Callback when video buffers */
  onBuffer?: (data: any) => void;
};

/**
 * Web-specific video player component using hls.js for HLS streams
 * Falls back to native HTML5 video for other formats
 */
export function WebVideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  description,
  showControls = true,
  autoplay = false,
  muted = true,
  loop = false,
  aspectRatio,
  onLoadStart,
  onLoad,
  onError,
  onEnd,
  onProgress,
  onBuffer,
}: WebVideoPlayerProps) {
  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>('idle');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

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

  // Initialize HLS player
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;
    const isHLS = videoUrl.includes('.m3u8');

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initializeVideo = async () => {
      try {
        onLoadStart?.();
        setPlayerStatus('loading');
        setPlayerError(null);

        if (isHLS) {
          // Use hls.js for HLS streams
          if (Hls.isSupported()) {
            hlsRef.current = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hlsRef.current.loadSource(videoUrl);
            hlsRef.current.attachMedia(video);

            hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
              setPlayerStatus('readyToPlay');
              onLoad?.({ duration: video.duration });
            });

            hlsRef.current.on(Hls.Events.ERROR, (event: any, data: any) => {
              console.error('HLS Error:', data);
              setPlayerStatus('error');
              setPlayerError(`HLS Error: ${data.details}`);
              onError?.(data);
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = videoUrl;
            video.addEventListener('loadedmetadata', () => {
              setPlayerStatus('readyToPlay');
              onLoad?.({ duration: video.duration });
            });
          } else {
            throw new Error('HLS is not supported in this browser');
          }
        } else {
          // Regular video format
          video.src = videoUrl;
          video.addEventListener('loadedmetadata', () => {
            setPlayerStatus('readyToPlay');
            onLoad?.({ duration: video.duration });
          });
        }

        // Add event listeners
        video.addEventListener('error', (event) => {
          console.error('Video Error:', event);
          setPlayerStatus('error');
          setPlayerError('Failed to load video');
          onError?.(event);
        });

        video.addEventListener('ended', () => {
          onEnd?.();
        });

        video.addEventListener('timeupdate', () => {
          onProgress?.({
            currentTime: video.currentTime,
            duration: video.duration,
            playableDuration: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
          });
        });

        video.addEventListener('progress', () => {
          onBuffer?.({
            buffered: video.buffered,
          });
        });
      } catch (error) {
        console.error('Video initialization error:', error);
        setPlayerStatus('error');
        setPlayerError(`Failed to initialize video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        onError?.(error);
      }
    };

    initializeVideo();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, onLoadStart, onLoad, onError, onEnd, onProgress, onBuffer]);

  // Set video properties when status changes
  useEffect(() => {
    if (videoRef.current && playerStatus === 'readyToPlay') {
      const video = videoRef.current;
      video.controls = showControls;
      video.muted = muted;
      video.loop = loop;
      video.autoplay = autoplay;
      video.poster = thumbnailUrl || '';
    }
  }, [playerStatus, showControls, muted, loop, autoplay, thumbnailUrl]);

  // Show error state
  if (playerStatus === 'error') {
    return (
      <ThemedCard style={styles.container}>
        <ThemedView
          style={[styles.videoContainer, { aspectRatio: aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9 }]}
        >
          <View style={styles.errorContainer}>
            <ThemedText style={[styles.errorText, { color: textColor }]}>
              {playerError && playerError.trim() ? playerError : 'Failed to load video'}
            </ThemedText>
            <ThemedText style={[styles.retryText, { color: secondaryTextColor }]}>Please try refreshing the page</ThemedText>
          </View>
        </ThemedView>
      </ThemedCard>
    );
  }

  // Calculate aspect ratio
  const videoAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

  return (
    <ThemedCard style={styles.container}>
      <ThemedView style={[styles.videoContainer, { aspectRatio: videoAspectRatio }]}>
        <video
          ref={videoRef}
          style={videoStyles.video}
          controls={showControls}
          muted={muted}
          loop={loop}
          autoPlay={autoplay}
          poster={thumbnailUrl}
          playsInline
        />
        {playerStatus === 'loading' && (
          <View style={styles.loadingContainer}>
            <ThemedText style={[styles.loadingText, { color: textColor }]}>Loading video...</ThemedText>
          </View>
        )}
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
              {hasTitle && <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>}
              {hasDescription && (
                <ThemedText style={[styles.description, { color: secondaryTextColor }]}>{description}</ThemedText>
              )}
            </ThemedView>
          );
        })()}
    </ThemedCard>
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
    position: 'relative',
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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

// Web-specific styles for the video element
const videoStyles = {
  video: {
    width: '100%',
    height: '100%',
    display: 'block',
  } as React.CSSProperties,
};
