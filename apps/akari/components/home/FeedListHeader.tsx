import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { ThemedView } from '@/components/ThemedView';
import { TrendingBar } from '@/components/TrendingBar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, semanticColors, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type FeedTab = { key: string; label: string };

type FeedListHeaderProps = {
  isLargeScreen: boolean;
  insetTop: number;
  feedTabs: FeedTab[];
  selectedFeed: string | undefined;
  anyFilterActive: boolean;
  filterIconColor: string;
  onTabChange: (key: string) => void;
  onShowFilters: () => void;
};

export function FeedListHeader({
  isLargeScreen,
  insetTop,
  feedTabs,
  selectedFeed,
  anyFilterActive,
  filterIconColor,
  onTabChange,
  onShowFilters,
}: FeedListHeaderProps) {
  const { t } = useTranslation();

  return (
    <ThemedView
      style={[
        styles.listHeaderContainer,
        {
          paddingTop: isLargeScreen ? insetTop : 0,
          paddingBottom: isLargeScreen ? spacing.md : 0,
        },
      ]}
    >
      <ThemedView style={styles.listHeaderContent}>
        <ThemedView style={styles.feedRow}>
          <ThemedView style={styles.tabBarSlot}>
            <TabBar tabs={feedTabs} activeTab={selectedFeed || ''} onTabChange={onTabChange} />
          </ThemedView>
          <Pressable
            style={({ pressed }) => [styles.filterButton, pressed && { opacity: activeOpacity.default }]}
            onPress={onShowFilters}
            accessibilityRole="button"
            accessibilityLabel={t('feed.filters')}
            disabled={!selectedFeed}
          >
            <IconSymbol
              name="line.3.horizontal.decrease.circle"
              size={fontSize.xxl}
              color={anyFilterActive ? semanticColors.systemBlue : filterIconColor}
            />
          </Pressable>
        </ThemedView>
        <TrendingBar />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listHeaderContainer: {},
  listHeaderContent: {
    width: '100%',
    alignSelf: 'stretch',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarSlot: {
    flex: 1,
    minWidth: 0,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// re-export type
export type { FeedTab };
