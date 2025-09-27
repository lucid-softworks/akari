import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { BlueskyTrendingTopic } from '@/bluesky-api';

type TrendingTopicsBarProps = {
  onTopicPress?: (topic: string, link?: string) => void;
  limit?: number;
};

export function TrendingTopicsBar({ onTopicPress, limit = 12 }: TrendingTopicsBarProps) {
  const { data: topics } = useTrendingTopics(limit);
  const containerColor = useThemeColor({ light: '#F8FAFC', dark: '#111418' }, 'background');
  const chipColor = useThemeColor({ light: '#EEF2FF', dark: '#1F2937' }, 'background');
  const chipPressedColor = useThemeColor({ light: '#E0E7FF', dark: '#334155' }, 'background');
  const chipBorderColor = useThemeColor({ light: '#CBD5F5', dark: '#2E3646' }, 'border');

  const handlePress = useCallback(
    (topic: BlueskyTrendingTopic) => {
      onTopicPress?.(topic.topic, topic.link);
    },
    [onTopicPress],
  );

  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: containerColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {topics.map((topic, index) => {
          const isLast = index === topics.length - 1;

          return (
            <Pressable
              key={topic.topic}
              accessibilityRole="button"
              accessibilityLabel={topic.topic}
              onPress={() => handlePress(topic)}
              style={({ pressed }) => [
                styles.chip,
                !isLast ? styles.chipSpacing : undefined,
                {
                  backgroundColor: pressed ? chipPressedColor : chipColor,
                  borderColor: chipBorderColor,
                },
              ]}
            >
              <ThemedText style={styles.chipText} numberOfLines={1}>
                {topic.topic}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipSpacing: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

