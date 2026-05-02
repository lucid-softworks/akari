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

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0) setHeaderHeight(h);
  }, []);

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

  // Capture the pin intent at first mount only — later re-renders shouldn't be
  // able to forget or repeat a pending pin.
  const shouldPinRef = useRef(pinTabsOnMount);
  const hasPinnedRef = useRef(false);

  // Pin via scrollToOffset(headerHeight) once the header has been measured by
  // onLayout. scrollToOffset doesn't require items to be measured ahead of time,
  // unlike scrollToIndex, so this fires reliably right after the first layout
  // pass.
  useEffect(() => {
    if (hasPinnedRef.current) return;
    if (!shouldPinRef.current || !hasStickyTab) return;
    if (headerHeight === 0) return;
    listRef.current?.scrollToOffset({ offset: headerHeight, animated: false });
    hasPinnedRef.current = true;
  }, [headerHeight, hasStickyTab]);

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
