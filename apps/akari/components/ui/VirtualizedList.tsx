import React from 'react';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps } from '@shopify/flash-list';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';

const DEFAULT_ESTIMATED_ITEM_SIZE = 240;
const DEFAULT_OVERSCAN = 2;

export type VirtualizedListHandle<T> = FlashList<T>;

export type VirtualizedListProps<T> = Omit<FlashListProps<T>, 'estimatedItemSize' | 'style'> & {
  estimatedItemSize?: number;
  overscan?: number;
};

function VirtualizedListInner<T>(
  {
    data,
    renderItem,
    overscan = DEFAULT_OVERSCAN,
    estimatedItemSize: incomingEstimatedItemSize,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    stickyHeaderIndices,
    ...rest
  }: VirtualizedListProps<T>,
  ref: React.ForwardedRef<VirtualizedListHandle<T>>,
) {
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
    (
      info: Parameters<NonNullable<FlashListProps<T>['renderItem']>>[0],
    ) => {
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

  return (
    <ComponentErrorBoundary>
      <FlashList
        {...(flashListProps as FlashListProps<T>)}
        ref={ref as React.Ref<FlashList<T>>}
        data={typedData}
        renderItem={renderItemWithStickyHeader}
        estimatedItemSize={estimatedItemSize}
        drawDistance={drawDistance ?? overscan * estimatedItemSize}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={ListHeaderComponentStyle}
        stickyHeaderIndices={computedStickyHeaderIndices}
      />
    </ComponentErrorBoundary>
  );
}

const ForwardedVirtualizedList = React.forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListHandle<T>> },
) => React.ReactElement;

ForwardedVirtualizedList.displayName = 'VirtualizedList';

export const VirtualizedList = React.memo(ForwardedVirtualizedList) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListHandle<T>> },
) => React.ReactElement;
