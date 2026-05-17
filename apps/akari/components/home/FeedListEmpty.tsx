import React from 'react';
import { StyleSheet } from 'react-native';

import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type FeedListEmptyProps = {
  state: 'select' | 'loading' | 'empty';
};

export function FeedListEmpty({ state }: FeedListEmptyProps) {
  const { t } = useTranslation();

  if (state === 'loading') {
    return <FeedSkeleton count={5} />;
  }

  if (state === 'select') {
    return (
      <ThemedView style={styles.selectFeedPrompt}>
        <ThemedText style={styles.selectFeedText}>{t('feed.selectFeedToView')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.emptyState}>
      <ThemedText style={styles.emptyStateText}>{t('feed.noPostsInFeed')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
  selectFeedPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },
  selectFeedText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
});
