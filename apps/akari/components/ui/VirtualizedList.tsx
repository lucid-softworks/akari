import React from 'react';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps, FlashListRef } from '@shopify/flash-list';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';

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

  const { drawDistance, ...flashListProps } = rest;
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
  } as React.ComponentProps<typeof FlashList<T>>;

  return (
    <ComponentErrorBoundary>
      <FlashList {...flashListPassthrough} />
    </ComponentErrorBoundary>
  );
}
