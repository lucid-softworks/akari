import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type TopPostProps = {
  post: {
    uri: string;
    content: string;
    image?: string;
    notes: number;
    author?: {
      handle: string;
      displayName: string;
      avatar: string;
    };
  };
  onPostPress?: (uri: string) => void;
};

export function TopPost({ post, onPostPress }: TopPostProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>TOP POST</ThemedText>
        <ThemedText style={styles.notes}>+{post.notes} notes</ThemedText>
      </View>

      <View style={styles.postContainer}>
        <TouchableOpacity style={styles.contentContainer} onPress={() => onPostPress?.(post.uri)} activeOpacity={0.8}>
          {post.content && (
            <ThemedText style={styles.content} numberOfLines={3}>
              {post.content}
            </ThemedText>
          )}
          {post.image && (
            <Image
              source={{ uri: post.image }}
              style={styles.image}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
          )}
        </TouchableOpacity>

        {post.author && (
          <View style={styles.authorContainer}>
            <Image
              source={{ uri: post.author.avatar }}
              style={styles.authorAvatar}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
            <ThemedText style={styles.authorName} numberOfLines={1}>
              {post.author.displayName || post.author.handle}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  notes: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  postContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    height: 68, // Fixed height to match biggest fans (48px avatar + 8px margin + ~12px text)
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 68, // Fixed height to match biggest fans
    borderRadius: 8,
  },
  authorContainer: {
    alignItems: 'center',
    width: 60,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
});
