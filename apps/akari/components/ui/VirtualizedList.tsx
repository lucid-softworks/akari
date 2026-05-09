import React from 'react';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps, FlashListRef } from '@shopify/flash-list';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { WebPullToRefresh } from '@/components/ui/WebPullToRefresh';

const DEFAULT_ESTIMATED_ITEM_SIZE = 240;
const DEFAULT_OVERSCAN = 2;

export type VirtualizedListHandle<T> = FlashListRef<T>;

export type VirtualizedListProps<T> = Omit<FlashListProps<T>, 'estimatedItemSize' | 'style'> & {
  estimatedItemSize?: number;
  overscan?: number;
  ref?: React.Ref<VirtualizedListHandle<T>>;
};

// React 19+ accepts `ref` as a regular prop, so we skip forwardRef and the
// memo+generic-cast dance the previous version needed.
export function VirtualizedList<T>({
  data,
  renderItem,
  overscan = DEFAULT_OVERSCAN,
  estimatedItemSize: incomingEstimatedItemSize,
  ListHeaderComponent,
  ListHeaderComponentStyle,
  stickyHeaderIndices,
  ref,
  ...rest
}: VirtualizedListProps<T>) {
  const estimatedItemSize = incomingEstimatedItemSize ?? DEFAULT_ESTIMATED_ITEM_SIZE;
  const typedData = data as T[];

  const { drawDistance, onScroll: incomingOnScroll, onRefresh, ...flashListProps } = rest;

  // The web pull-to-refresh wrapper must only fire when the list is
  // at scrollTop=0; otherwise pulling-down-to-scroll-up would trigger
  // a refresh.
  const [atTop, setAtTop] = React.useState(true);
  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setAtTop((prev) => {
        const next = y <= 0;
        return prev === next ? prev : next;
      });
      incomingOnScroll?.(event);
    },
    [incomingOnScroll],
  );
  const shouldAutoStickHeader = stickyHeaderIndices === undefined && Boolean(ListHeaderComponent);
  const computedStickyHeaderIndices =
    stickyHeaderIndices !== undefined
      ? stickyHeaderIndices
      : shouldAutoStickHeader
        ? [0]
        : undefined;

  const renderItemWithStickyHeader = React.useCallback(
    (info: Parameters<NonNullable<FlashListProps<T>['renderItem']>>[0]) => {
      if (
        shouldAutoStickHeader &&
        info.target === 'StickyHeader' &&
        info.index === 0 &&
        ListHeaderComponent
      ) {
        if (React.isValidElement(ListHeaderComponent)) {
          return ListHeaderComponent;
        }

        const HeaderComponent = ListHeaderComponent;
        return <HeaderComponent />;
      }

      return renderItem ? renderItem(info) : null;
    },
    [ListHeaderComponent, renderItem, shouldAutoStickHeader],
  );

  const flashListPassthrough = {
    ...(flashListProps as FlashListProps<T>),
    ref,
    data: typedData,
    renderItem: renderItemWithStickyHeader,
    estimatedItemSize,
    drawDistance: drawDistance ?? overscan * estimatedItemSize,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    stickyHeaderIndices: computedStickyHeaderIndices,
    onScroll: handleScroll,
    // FlashList's web build no-ops onRefresh, so route it through the
    // PullToRefresh wrapper below on web only. On native, FlashList
    // handles the refresh control natively.
    onRefresh: Platform.OS === 'web' ? undefined : onRefresh,
  } as React.ComponentProps<typeof FlashList<T>>;

  const list = (
    <ComponentErrorBoundary>
      <FlashList {...flashListPassthrough} />
    </ComponentErrorBoundary>
  );

  if (Platform.OS === 'web' && onRefresh) {
    return (
      <WebPullToRefresh onRefresh={onRefresh} isPullable={atTop}>
        {list}
      </WebPullToRefresh>
    );
  }

  return list;
}
