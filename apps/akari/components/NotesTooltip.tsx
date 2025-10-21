import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';

type TopPost = {
  uri: string;
  image: string;
  notes: number;
  content?: string;
};

type NotesTooltipProps = {
  value: number;
  timestamp: string;
  topPosts: TopPost[];
  onPostPress?: (uri: string) => void;
};

export function NotesTooltip({ value, timestamp, topPosts, onPostPress }: NotesTooltipProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <ThemedText style={styles.tooltipSubtitle}>
        {formatTime(timestamp)} • {value} {t('chartTooltip.notes')}
      </ThemedText>

      <View style={styles.postsList}>
        {topPosts.slice(0, 3).map((post) => (
          <ThemedView key={post.uri} style={[styles.postItem, { borderColor }]} onTouchEnd={() => onPostPress?.(post.uri)}>
            <ThemedText style={styles.postNotes}>+{post.notes}</ThemedText>
            <ThemedText style={styles.postContent} numberOfLines={2}>
              {post.content || 'Post content...'}
            </ThemedText>
          </ThemedView>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tooltipSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  postsList: {
    gap: 6,
  },
  postItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  postNotes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 2,
  },
  postContent: {
    fontSize: 11,
    opacity: 0.8,
  },
});
