import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  isActive?: boolean;
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
  isActive = true,
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

  // Pin to the parent-provided scroll target whenever this tab becomes the
  // active one — including on first mount. Keeps the visual banner/sticky-tab
  // state in sync across tab switches even though each tab owns its own
  // FlatList.
  const pinScrollYRef = useRef(pinScrollY ?? 0);
  pinScrollYRef.current = pinScrollY ?? 0;

  // First-mount: lock in the initial scroll natively via contentOffset so the
  // FlatList starts at the right scroll on its very first paint — no frame
  // where the user briefly sees the new tab from the top.
  const initialContentOffsetRef = useRef({ x: 0, y: pinScrollY ?? 0 });

  // Re-activations (already-mounted tab toggling back to active): scroll
  // synchronously before the next paint via useLayoutEffect.
  const isFirstActivationRef = useRef(true);
  useLayoutEffect(() => {
    if (!isActive) return;
    if (isFirstActivationRef.current) {
      // First activation already handled by contentOffset; skip.
      isFirstActivationRef.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: pinScrollYRef.current, animated: false });
  }, [isActive]);

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
      refreshing={refreshing ?? false}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews={false}
      contentOffset={initialContentOffsetRef.current}
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
