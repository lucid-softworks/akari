import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';

type SpecialItem =
  | { __type: 'header' }
  | { __type: 'stickyTab' }
  | { __type: 'skeleton' }
  | { __type: 'empty' };

type ProfileTabFlatListProps<T> = {
  data: T[];
  renderItem: (item: T) => React.ReactElement | null;
  keyExtractor: (item: T) => string;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  StickyTabComponent?: React.ReactElement | null;
  emptyText: string;
  pinTabsOnMount?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ProfileTabFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  ListHeaderComponent,
  StickyTabComponent,
  emptyText,
  pinTabsOnMount,
  onRefresh,
  refreshing,
}: ProfileTabFlatListProps<T>) {
  const listRef = useRef<FlatList<T | SpecialItem>>(null);

  const hasHeader = !!ListHeaderComponent;
  const hasStickyTab = !!StickyTabComponent;

  const stickyIndices = useMemo(
    () => (hasStickyTab ? [hasHeader ? 1 : 0] : undefined),
    [hasHeader, hasStickyTab],
  );
  const stickyIndex = hasHeader ? 1 : 0;

  const listData = useMemo<(T | SpecialItem)[]>(() => {
    const prefix: SpecialItem[] = [];
    if (hasHeader) prefix.push({ __type: 'header' });
    if (hasStickyTab) prefix.push({ __type: 'stickyTab' });

    if (isLoading && data.length === 0) {
      return [...prefix, { __type: 'skeleton' }];
    }
    if (data.length === 0) {
      return [...prefix, { __type: 'empty' }];
    }
    return [...prefix, ...data];
  }, [data, hasHeader, hasStickyTab, isLoading]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItemInner = useCallback(
    ({ item }: { item: T | SpecialItem }) => {
      if (isSpecial(item)) {
        switch (item.__type) {
          case 'header':
            return ListHeaderComponent ?? null;
          case 'stickyTab':
            return StickyTabComponent ?? null;
          case 'skeleton':
            return <FeedSkeleton count={3} />;
          case 'empty':
            return (
              <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
              </ThemedView>
            );
        }
      }
      return renderItem(item);
    },
    [ListHeaderComponent, StickyTabComponent, emptyText, renderItem],
  );

  const keyExtractorInner = useCallback(
    (item: T | SpecialItem) => (isSpecial(item) ? item.__type : keyExtractor(item)),
    [keyExtractor],
  );

  // Capture the pin intent at first mount only — we don't want a later
  // re-render with pinTabsOnMount=false to forget our pending pin, and we
  // don't want a re-render with pinTabsOnMount=true to re-pin after the user
  // has scrolled.
  const shouldPinRef = useRef(pinTabsOnMount);
  const hasPinnedRef = useRef(false);

  const tryPin = useCallback(() => {
    if (hasPinnedRef.current) return;
    if (!shouldPinRef.current || !hasStickyTab) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollToIndex({ index: stickyIndex, animated: false, viewPosition: 0 });
    hasPinnedRef.current = true;
  }, [hasStickyTab, stickyIndex]);

  // First attempt: next frame after mount. The FlatList ref is set but its
  // items often haven't laid out yet; if scrollToIndex fails we'll retry
  // below from onContentSizeChange / onScrollToIndexFailed.
  useEffect(() => {
    requestAnimationFrame(tryPin);
  }, [tryPin]);

  const handleContentSizeChange = useCallback(() => {
    tryPin();
  }, [tryPin]);

  return (
    <FlatList
      ref={listRef}
      data={listData}
      renderItem={renderItemInner}
      keyExtractor={keyExtractorInner}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={stickyIndices}
      stickyHeaderHiddenOnScroll
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews={false}
      onContentSizeChange={handleContentSizeChange}
      onScrollToIndexFailed={(info) => {
        // Item not measured yet — retry shortly. Reset the flag so tryPin can
        // run again from the next onContentSizeChange.
        hasPinnedRef.current = false;
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index: info.index,
            animated: false,
            viewPosition: 0,
          });
          hasPinnedRef.current = true;
        }, 50);
      }}
      ListFooterComponent={
        isFetchingNextPage && data.length > 0 ? (
          <ActivityIndicator style={styles.loadingFooter} />
        ) : null
      }
    />
  );
}

function isSpecial<T>(item: T | SpecialItem): item is SpecialItem {
  return typeof item === 'object' && item !== null && '__type' in item;
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  loadingFooter: {
    paddingVertical: 20,
  },
});
