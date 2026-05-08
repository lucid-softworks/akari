import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToFeed } from '@/utils/navigation';

/**
 * Horizontal pill row of trending topics, mirroring the bar that sits
 * under the home feed tabs in the official Bluesky app. Tapping a topic
 * opens its curated feed generator on a dedicated detail screen. Each
 * topic's `link` is in bsky.app web shape (`/profile/<handle>/feed/<rkey>`);
 * we parse it and route through the per-tab feed detail screen. Falls
 * back to a search route if the link doesn't match the expected shape
 * (the endpoint is `unspecced` — other AppViews can return anything).
 */
const TRENDING_LINK_PATTERN = /^\/profile\/([^/]+)\/feed\/([^/?#]+)/;

export function TrendingBar() {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');

  const { trendingBarEnabled } = useFeedSettings();
  const { data: topics } = useTrendingTopics(12, trendingBarEnabled);
  const navigateToFeed = useNavigateToFeed();

  const handleTopicPress = useCallback(
    (topic: { topic: string; link: string }) => {
      const match = TRENDING_LINK_PATTERN.exec(topic.link);
      if (match) {
        const [, handleOrDid, rkey] = match;
        navigateToFeed({ actor: handleOrDid, rKey: rkey });
        return;
      }
      router.push({
        pathname: '/(tabs)/search',
        params: { query: topic.topic },
      });
    },
    [navigateToFeed],
  );

  if (!trendingBarEnabled) return null;
  if (!topics || topics.length === 0) return null;

  return (
    <View style={[styles.container, { borderBottomColor: borderColor }]}>
      <View style={styles.label}>
        <IconSymbol name="flame" size={12} color={iconColor} />
        <ThemedText style={[styles.labelText, { color: iconColor }]}>
          {t('feed.trending')}
        </ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {topics.map((topic) => (
          <TouchableOpacity
            key={topic.link}
            style={[styles.pill, { borderColor }]}
            activeOpacity={activeOpacity.default}
            onPress={() => handleTopicPress(topic)}
          >
            <ThemedText
              style={[styles.pillText, { color: textColor }]}
              numberOfLines={1}
            >
              {topic.topic}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  labelText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  pill: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: 200,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
