import { useWindowVirtualizer } from '@tanstack/react-virtual';
import React from 'react';
import type { ListRenderItem } from 'react-native';

type RenderItemInfo<T> = Parameters<NonNullable<ListRenderItem<T>>>[0];

type VirtualizedListBodyProps<T> = {
  items: readonly T[];
  isMeasured: boolean;
  reservedHeight: number;
  totalSize: number;
  scrollMargin: number;
  virtualItems: ReturnType<ReturnType<typeof useWindowVirtualizer>['getVirtualItems']>;
  renderItem: ListRenderItem<T> | null | undefined;
  keyExtractor?: (item: T, index: number) => string;
  onItemRef: (node: HTMLDivElement | null) => void;
};

/**
 * Block-positioned virtualisation. We used to render every visible item
 * as `position: absolute` inside a container with `height: totalSize`.
 * That kept the container box tall, but absolute items contribute
 * nothing to the ancestor chain's intrinsic height — so column borders
 * on the page layout never extended past viewport even though the
 * document scrolled correctly.
 *
 * Now we render visible items in normal flow between two spacer divs
 * that absorb the heights of the not-currently-rendered items above and
 * below. Total height of the three regions still equals `totalSize`, and
 * the rendered items now push every flex/block ancestor up to the
 * document body.
 */
export function VirtualizedListBody<T>({
  items,
  isMeasured,
  reservedHeight,
  totalSize,
  scrollMargin,
  virtualItems,
  renderItem,
  keyExtractor,
  onItemRef,
}: VirtualizedListBodyProps<T>) {
  if (!isMeasured) {
    return <div style={{ width: '100%', height: reservedHeight }} />;
  }
  if (virtualItems.length === 0) {
    return <div style={{ width: '100%', height: totalSize }} />;
  }
  const firstStart = virtualItems[0].start - scrollMargin;
  const lastEnd = virtualItems[virtualItems.length - 1].end - scrollMargin;
  const spacerBefore = Math.max(0, firstStart);
  const spacerAfter = Math.max(0, totalSize - lastEnd);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height: spacerBefore }} />
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        const info: RenderItemInfo<T> = {
          item,
          index: virtualRow.index,
          separators: {
            highlight: () => undefined,
            unhighlight: () => undefined,
            updateProps: () => undefined,
          },
          target: 'Cell',
        } as RenderItemInfo<T>;
        const key = keyExtractor
          ? keyExtractor(item, virtualRow.index)
          : String(virtualRow.key);
        return (
          <div
            key={key}
            data-index={virtualRow.index}
            ref={onItemRef}
            style={{ width: '100%' }}
          >
            {renderItem ? renderItem(info) : null}
          </div>
        );
      })}
      <div style={{ width: '100%', height: spacerAfter }} />
    </div>
  );
}
