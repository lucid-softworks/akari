import React from 'react';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps } from '@shopify/flash-list';
import { View } from 'react-native';

const DEFAULT_ESTIMATED_ITEM_SIZE = 240;
const DEFAULT_OVERSCAN = 2;

export type VirtualizedListHandle<T> = FlashList<T>;

export type VirtualizedListProps<T> = Omit<FlashListProps<T>, 'estimatedItemSize'> & {
  estimatedItemSize?: number;
  overscan?: number;
};

const LIST_HEADER_SENTINEL = Symbol('virtualized-list-header');
const LIST_EMPTY_SENTINEL = Symbol('virtualized-list-empty');

function VirtualizedListInner<T>(
  {
    data,
    renderItem,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    ListEmptyComponent,
    stickyHeaderIndices,
    keyExtractor,
    getItemType,
    overrideItemLayout,
    overscan = DEFAULT_OVERSCAN,
    estimatedItemSize: incomingEstimatedItemSize,
    ...rest
  }: VirtualizedListProps<T>,
  ref: React.ForwardedRef<VirtualizedListHandle<T>>,
) {
  const estimatedItemSize = incomingEstimatedItemSize ?? DEFAULT_ESTIMATED_ITEM_SIZE;
  const typedData = React.useMemo(() => (data ?? []) as T[], [data]);
  const shouldRenderHeaderInsideList = Boolean(ListHeaderComponent) && stickyHeaderIndices?.includes(0);
  const headerCount = shouldRenderHeaderInsideList ? 1 : 0;
  const shouldInjectEmptyItem = shouldRenderHeaderInsideList && typedData.length === 0 && Boolean(ListEmptyComponent);
  const emptyIndex = shouldInjectEmptyItem ? headerCount + typedData.length : undefined;

  const headerElement = React.useMemo(() => {
    if (!shouldRenderHeaderInsideList || !ListHeaderComponent) {
      return null;
    }

    const content = React.isValidElement(ListHeaderComponent)
      ? ListHeaderComponent
      : React.createElement(ListHeaderComponent);

    return <View style={ListHeaderComponentStyle}>{content}</View>;
  }, [ListHeaderComponent, ListHeaderComponentStyle, shouldRenderHeaderInsideList]);

  const emptyElement = React.useMemo(() => {
    if (!shouldInjectEmptyItem || !ListEmptyComponent) {
      return null;
    }

    return React.isValidElement(ListEmptyComponent)
      ? ListEmptyComponent
      : React.createElement(ListEmptyComponent);
  }, [ListEmptyComponent, shouldInjectEmptyItem]);

  const dataWithHeader = React.useMemo(() => {
    if (!shouldRenderHeaderInsideList) {
      return typedData;
    }

    const listData: T[] = [LIST_HEADER_SENTINEL as unknown as T, ...typedData];

    if (shouldInjectEmptyItem) {
      listData.push(LIST_EMPTY_SENTINEL as unknown as T);
    }

    return listData;
  }, [shouldInjectEmptyItem, shouldRenderHeaderInsideList, typedData]);

  const renderItemWithHeader = React.useCallback(
    (info: Parameters<NonNullable<typeof renderItem>>[0]) => {
      if (!shouldRenderHeaderInsideList) {
        return renderItem?.(info);
      }

      if (info.index === 0) {
        return headerElement;
      }

      if (shouldInjectEmptyItem && info.index === emptyIndex) {
        return emptyElement;
      }

      if (!renderItem) {
        return null;
      }

      const adjustedIndex = info.index - headerCount;
      const originalItem = typedData[adjustedIndex];

      return renderItem({
        ...info,
        index: adjustedIndex,
        item: originalItem,
      });
    },
    [
      emptyIndex,
      headerCount,
      headerElement,
      emptyElement,
      renderItem,
      shouldInjectEmptyItem,
      shouldRenderHeaderInsideList,
      typedData,
    ],
  );

  const keyExtractorWithHeader = React.useCallback(
    (item: T, index: number) => {
      if (!shouldRenderHeaderInsideList) {
        return keyExtractor?.(item, index) ?? `${index}`;
      }

      if (index === 0) {
        return '__virtualized_list_header__';
      }

      if (shouldInjectEmptyItem && index === emptyIndex) {
        return '__virtualized_list_empty__';
      }

      const adjustedIndex = index - headerCount;
      const originalItem = typedData[adjustedIndex];

      return keyExtractor?.(originalItem, adjustedIndex) ?? `${adjustedIndex}`;
    },
    [emptyIndex, headerCount, keyExtractor, shouldInjectEmptyItem, shouldRenderHeaderInsideList, typedData],
  );

  const getItemTypeWithHeader = React.useCallback(
    (
      item: Parameters<NonNullable<typeof getItemType>>[0],
      index: number,
      extraData?: Parameters<NonNullable<typeof getItemType>>[2],
    ) => {
      if (!shouldRenderHeaderInsideList || !getItemType) {
        return getItemType?.(item, index, extraData);
      }

      if (index === 0) {
        return '__virtualized_list_header__';
      }

      if (shouldInjectEmptyItem && index === emptyIndex) {
        return '__virtualized_list_empty__';
      }

      const adjustedIndex = index - headerCount;
      const originalItem = typedData[adjustedIndex];

      return getItemType(originalItem, adjustedIndex, extraData);
    },
    [
      emptyIndex,
      getItemType,
      headerCount,
      shouldInjectEmptyItem,
      shouldRenderHeaderInsideList,
      typedData,
    ],
  );

  const overrideItemLayoutWithHeader = React.useCallback(
    (
      layout: Parameters<NonNullable<typeof overrideItemLayout>>[0],
      item: Parameters<NonNullable<typeof overrideItemLayout>>[1],
      index: number,
      maxColumns: Parameters<NonNullable<typeof overrideItemLayout>>[3],
      extraData?: Parameters<NonNullable<typeof overrideItemLayout>>[4],
    ) => {
      if (!shouldRenderHeaderInsideList || !overrideItemLayout) {
        return overrideItemLayout?.(layout, item, index, maxColumns, extraData);
      }

      if (index === 0) {
        return;
      }

      if (shouldInjectEmptyItem && index === emptyIndex) {
        return;
      }

      const adjustedIndex = index - headerCount;
      const originalItem = typedData[adjustedIndex];

      overrideItemLayout(layout, originalItem, adjustedIndex, maxColumns, extraData);
    },
    [
      emptyIndex,
      headerCount,
      overrideItemLayout,
      shouldInjectEmptyItem,
      shouldRenderHeaderInsideList,
      typedData,
    ],
  );

  const { drawDistance, ...flashListProps } = rest;

  return (
    <FlashList
      {...(flashListProps as FlashListProps<T>)}
      ref={ref as React.Ref<FlashList<T>>}
      data={dataWithHeader}
      renderItem={renderItemWithHeader}
      estimatedItemSize={estimatedItemSize}
      drawDistance={drawDistance ?? overscan * estimatedItemSize}
      keyExtractor={keyExtractorWithHeader}
      getItemType={getItemTypeWithHeader}
      overrideItemLayout={overrideItemLayoutWithHeader}
      ListHeaderComponent={shouldRenderHeaderInsideList ? undefined : ListHeaderComponent}
      ListHeaderComponentStyle={shouldRenderHeaderInsideList ? undefined : ListHeaderComponentStyle}
      ListEmptyComponent={shouldRenderHeaderInsideList ? undefined : ListEmptyComponent}
      stickyHeaderIndices={stickyHeaderIndices}
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
