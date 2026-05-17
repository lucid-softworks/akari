import { Pressable, StyleSheet } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import { VideoCaption } from './VideoCaption';

type ThumbnailViewProps = {
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  aspectRatio?: { width: number; height: number };
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Pre-playback poster + play button overlay for the native video
 * player. Renders the optional caption beneath via VideoCaption.
 */
export function ThumbnailView({
  thumbnailUrl,
  title,
  description,
  aspectRatio,
  disabled,
  onPress,
}: ThumbnailViewProps) {
  const ratio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => pressed && { opacity: 0.8 }}
    >
      <ThemedCard style={styles.container}>
        <ThemedView style={[styles.thumbnailContainer, { aspectRatio: ratio }]}>
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

        <VideoCaption title={title} description={description} />
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
});
