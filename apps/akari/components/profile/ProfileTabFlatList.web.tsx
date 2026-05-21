import React, { use, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TabChromeContext } from '@/app/(tabs)/_layout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { VirtualizedList } from '@/components/ui/VirtualizedList.web';
import { useThemeColor } from '@/hooks/useThemeColor';

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

/**
 * Web variant of `ProfileTabFlatList`. Renders the profile header as a
 * normal in-flow block, the tabs strip as a sticky element pinned under
 * the chrome top inset, and the tab's content using the same window-
 * virtualized list pattern as the home feed (`VirtualizedList.web`).
 *
 * The point of mirroring the home feed: the entire profile page scrolls
 * the document body, not an inner container — banner/avatar slide up
 * normally, the tabs strip pins to the top, and the post list can grow
 * to whatever height it wants without needing an inner overflow box.
 */
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
  onRefresh,
  refreshing,
  onScrollY,
  onHeaderHeightChange,
}: ProfileTabFlatListProps<T>) {
  // Match the home feed's sticky-strip background so cards don't bleed
  // through during scroll.
  const surfaceBackground = useThemeColor({}, 'background');
  const { topInset } = use(TabChromeContext);

  // Forward window scroll position + header height to the parent so it
  // can preserve the user's vertical position when switching tabs.
  const onScrollYRef = useRef(onScrollY);
  onScrollYRef.current = onScrollY;
  useEffect(() => {
    const handler = () => onScrollYRef.current?.(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const headerWrapperRef = useRef<HTMLDivElement | null>(null);
  const onHeaderHeightRef = useRef(onHeaderHeightChange);
  onHeaderHeightRef.current = onHeaderHeightChange;
  useEffect(() => {
    const node = headerWrapperRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const h = node.getBoundingClientRect().height;
      onHeaderHeightRef.current?.(h);
    });
    observer.observe(node);
    onHeaderHeightRef.current?.(node.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItemAdapter = ({ item }: { item: T }) => renderItem(item);

  return (
    <View>
      {ListHeaderComponent ? (
        <div ref={headerWrapperRef}>{ListHeaderComponent}</div>
      ) : null}
      {StickyTabComponent ? (
        <div
          style={{
            position: 'sticky',
            top: topInset,
            zIndex: 10,
            backgroundColor: surfaceBackground,
          }}
        >
          {StickyTabComponent}
        </div>
      ) : null}

      {isLoading && data.length === 0 ? (
        <FeedSkeleton count={3} />
      ) : data.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
        </ThemedView>
      ) : (
        <VirtualizedList
          data={data}
          renderItem={renderItemAdapter}
          keyExtractor={keyExtractor}
          estimatedItemSize={320}
          overscan={3}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {isFetchingNextPage && data.length > 0 ? (
        <ActivityIndicator style={styles.loadingFooter} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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

