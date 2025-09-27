import React from 'react';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps } from '@shopify/flash-list';

const DEFAULT_ESTIMATED_ITEM_SIZE = 240;
const DEFAULT_OVERSCAN = 2;

export type VirtualizedListHandle<T> = FlashList<T>;

export type VirtualizedListProps<T> = Omit<FlashListProps<T>, 'estimatedItemSize'> & {
  estimatedItemSize?: number;
  overscan?: number;
};

function VirtualizedListInner<T>(
  { data, renderItem, overscan = DEFAULT_OVERSCAN, estimatedItemSize: incomingEstimatedItemSize, ...rest }: VirtualizedListProps<T>,
  ref: React.ForwardedRef<VirtualizedListHandle<T>>,
) {
  const estimatedItemSize = incomingEstimatedItemSize ?? DEFAULT_ESTIMATED_ITEM_SIZE;
  const typedData = data as T[];

  const { drawDistance, ...flashListProps } = rest;

  return (
    <FlashList
      {...(flashListProps as FlashListProps<T>)}
      ref={ref as React.Ref<FlashList<T>>}
      data={typedData}
      renderItem={renderItem}
      estimatedItemSize={estimatedItemSize}
      drawDistance={drawDistance ?? overscan * estimatedItemSize}
    />
  );
}

const ForwardedVirtualizedList = React.forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListHandle<T>> },
) => React.ReactElement;

ForwardedVirtualizedList.displayName = 'VirtualizedList';

export const VirtualizedList = React.memo(ForwardedVirtualizedList) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListHandle<T>> },
) => React.ReactElement;
