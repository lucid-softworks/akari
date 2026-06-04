import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';

type VideoThumbnailProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  /** Tint for the centered play badge — defaults to white. */
  badgeColor?: string;
};

/**
 * Renders a single still frame of a local video file as a small
 * preview. We seek to a random point in the clip (rather than t=0)
 * so a black opening frame doesn't render as an empty rectangle —
 * matches what the official Bluesky composer does.
 */
export function VideoThumbnail({ uri, style, badgeColor = '#ffffff' }: VideoThumbnailProps) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.muted = true;
  });

  // Seek once we know the clip's duration. Re-seek if the same
  // component instance gets a different clip (uri prop changes).
  const seekedForUriRef = useRef<string | null>(null);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  if (
    status === 'readyToPlay' &&
    seekedForUriRef.current !== uri &&
    player.duration > 0
  ) {
    seekedForUriRef.current = uri;
    // Pick a random offset in the middle 80% of the clip — avoids
    // the very first / last frames which often have hard cuts to
    // black.
    const target = player.duration * (0.1 + Math.random() * 0.8);
    player.currentTime = target;
  }

  return (
    <View style={[styles.wrapper, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      <View style={styles.badge}>
        <IconSymbol name="play.fill" size={14} color={badgeColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 28,
    height: 28,
    marginTop: -14,
    marginLeft: -14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
