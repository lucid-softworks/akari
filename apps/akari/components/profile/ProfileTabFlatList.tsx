import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

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
  pinScrollY?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  onScrollY?: (y: number) => void;
  onHeaderHeightChange?: (h: number) => void;
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
  pinScrollY,
  onRefresh,
  refreshing,
  onScrollY,
  onHeaderHeightChange,
}: ProfileTabFlatListProps<T>) {
  const listRef = useRef<FlatList<T | SpecialItem>>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const hasHeader = !!ListHeaderComponent;
  const hasStickyTab = !!StickyTabComponent;

  const stickyIndices = useMemo(
    () => (hasStickyTab ? [hasHeader ? 1 : 0] : undefined),
    [hasHeader, hasStickyTab],
  );

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

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const h = event.nativeEvent.layout.height;
      if (h > 0) {
        setHeaderHeight(h);
        onHeaderHeightChange?.(h);
      }
    },
    [onHeaderHeightChange],
  );

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      onScrollY?.(event.nativeEvent.contentOffset.y);
    },
    [onScrollY],
  );

  const renderItemInner = useCallback(
    ({ item }: { item: T | SpecialItem }) => {
      if (isSpecial(item)) {
        switch (item.__type) {
          case 'header':
            return ListHeaderComponent ? (
              <View onLayout={handleHeaderLayout}>{ListHeaderComponent}</View>
            ) : null;
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
    [ListHeaderComponent, StickyTabComponent, emptyText, handleHeaderLayout, renderItem],
  );

  const keyExtractorInner = useCallback(
    (item: T | SpecialItem) => (isSpecial(item) ? item.__type : keyExtractor(item)),
    [keyExtractor],
  );

  // Capture the desired initial scroll Y at first mount only. Later re-renders
  // won't change it; we only want to scroll once, on initial layout.
  const initialScrollYRef = useRef(pinScrollY ?? 0);
  const hasPinnedRef = useRef(false);

  useEffect(() => {
    if (hasPinnedRef.current) return;
    const target = initialScrollYRef.current;
    if (target <= 0) {
      hasPinnedRef.current = true;
      return;
    }
    listRef.current?.scrollToOffset({ offset: target, animated: false });
    hasPinnedRef.current = true;
  }, []);

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
      onScroll={handleScroll}
      scrollEventThrottle={32}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews={false}
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
