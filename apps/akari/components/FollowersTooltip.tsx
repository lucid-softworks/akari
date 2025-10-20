import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';

type Follower = {
  handle: string;
  displayName: string;
  avatar?: string;
  followerCount: number;
};

type FollowersTooltipProps = {
  value: number;
  timestamp: string;
};

export function FollowersTooltip({ value, timestamp }: FollowersTooltipProps) {
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

  // Mock data for biggest followers
  const mockBiggestFollowers: Follower[] = [
    { handle: '@alice.bsky.social', displayName: 'Alice Johnson', followerCount: 125000 },
    { handle: '@bob.bsky.social', displayName: 'Bob Smith', followerCount: 89000 },
    { handle: '@charlie.bsky.social', displayName: 'Charlie Brown', followerCount: 67000 },
  ];

  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <>
      <ThemedText style={styles.tooltipSubtitle}>
        {formatTime(timestamp)} • {value} {t('chartTooltip.followers')}
      </ThemedText>

      <View style={styles.followersList}>
        {mockBiggestFollowers.slice(0, 3).map((follower) => (
          <ThemedView key={follower.handle} style={[styles.followerItem, { borderColor }]}>
            <ThemedText style={styles.followerName} numberOfLines={1}>
              {follower.displayName}
            </ThemedText>
            <ThemedText style={styles.followerCount}>{formatFollowerCount(follower.followerCount)} followers</ThemedText>
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
  followersList: {
    gap: 6,
  },
  followerItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  followerName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  followerCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
});
