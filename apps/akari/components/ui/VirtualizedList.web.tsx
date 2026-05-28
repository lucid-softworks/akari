import { useWindowVirtualizer } from '@tanstack/react-virtual';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import type {
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { VirtualizedListBody } from '@/components/ui/VirtualizedListBody.web';
import { WebPullToRefresh } from '@/components/ui/WebPullToRefresh';

const DEFAULT_ESTIMATED_ITEM_SIZE = 240;
const DEFAULT_OVERSCAN = 2;
const DEFAULT_END_REACHED_THRESHOLD = 0.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
export type VirtualizedListHandle<_T> = any;

export type VirtualizedListProps<T> = {
  data: readonly T[] | null | undefined;
  renderItem: ListRenderItem<T> | null | undefined;
  keyExtractor?: (item: T, index: number) => string;
  estimatedItemSize?: number;
  overscan?: number;
  ListHeaderComponent?: React.ReactElement | React.ComponentType | null;
  ListHeaderComponentStyle?: StyleProp<ViewStyle>;
  ListFooterComponent?: React.ReactElement | React.ComponentType | null;
  ListEmptyComponent?: React.ReactElement | React.ComponentType | null;
  stickyHeaderIndices?: readonly number[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollBeginDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  showsVerticalScrollIndicator?: boolean;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  drawDistance?: number;
  ref?: React.Ref<VirtualizedListHandle<T>>;
  [extra: string]: unknown;
};

type SlotComponent = React.ReactElement | React.ComponentType | null | undefined;

function Slot({ component }: { component: SlotComponent }) {
  if (!component) return null;
  if (React.isValidElement(component)) return component;
  const Comp = component as React.ComponentType;
  return <Comp />;
}

/**
 * Web virtualised list backed by `@tanstack/react-virtual`'s
 * `useWindowVirtualizer`. The page itself scrolls — no inner container
 * has its own overflow.
 *
 * Mount sequence: the parent div renders with the header on the first
 * pass, a callback ref measures `offsetTop` synchronously during commit,
 * and only then do virtual items render. This avoids painting items
 * with the stale `scrollMargin=0` and then jumping them to the correct
 * position once a useLayoutEffect catches up — that jump showed up as a
 * 1–2 second window where the feed felt unresponsive while the
 * virtualizer churned through measurements at the wrong positions.
 */
export function VirtualizedList<T>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize = DEFAULT_ESTIMATED_ITEM_SIZE,
  overscan = DEFAULT_OVERSCAN,
  ListHeaderComponent,
  // eslint-disable-next-line no-unused-vars
  ListHeaderComponentStyle: _ListHeaderComponentStyle,
  ListFooterComponent,
  ListEmptyComponent,
  stickyHeaderIndices,
  contentContainerStyle,
  style,
  onEndReached,
  onEndReachedThreshold = DEFAULT_END_REACHED_THRESHOLD,
  onScroll,
  onScrollBeginDrag,
  refreshing,
  onRefresh,
  ref,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [parentOffset, setParentOffset] = useState<number | null>(null);

  // useWindowVirtualizer's `scrollMargin` is the parent's offset from
  // the document top, so measure with getBoundingClientRect+scrollY
  // (not `offsetTop`, which is relative to the nearest positioned
  // ancestor and is wrong as soon as a `position: relative` View sits
  // between us and the body — RN-Web defaults Views to relative).
  const measureParent = (node: HTMLDivElement) =>
    node.getBoundingClientRect().top + window.scrollY;

  const setParentNode = useCallback((node: HTMLDivElement | null) => {
    parentRef.current = node;
    if (node) {
      const next = measureParent(node);
      setParentOffset((prev) => (prev === next ? prev : next));
    }
  }, []);

  useEffect(() => {
    const node = parentRef.current;
    if (!node) return;
    // Layout shifts above the list (sticky banner toggling, header
    // collapse, etc) move the parent — re-measure on resize so the
    // virtualizer's scrollMargin stays accurate.
    const update = () => {
      const current = parentRef.current;
      if (!current) return;
      const next = measureParent(current);
      setParentOffset((prev) => (prev === next ? prev : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const items = useMemo(() => (data ? Array.from(data) : []), [data]);

  const isMeasured = parentOffset !== null;

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimatedItemSize,
    overscan,
    scrollMargin: parentOffset ?? 0,
  });

  // ---------------------------------------------------------------
  // Ref handle (FlashList-compatible)
  // ---------------------------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      scrollToOffset: ({ offset, animated }: { offset: number; animated?: boolean }) => {
        window.scrollTo({
          top: (parentOffset ?? 0) + offset,
          behavior: animated ? 'smooth' : 'auto',
        });
      },
      scrollToIndex: ({
        index,
        animated,
        viewPosition,
      }: {
        index: number;
        animated?: boolean;
        viewPosition?: number;
      }) => {
        virtualizer.scrollToIndex(index, {
          behavior: animated ? 'smooth' : 'auto',
          align: viewPosition === 0.5 ? 'center' : viewPosition === 1 ? 'end' : 'start',
        });
      },
      scrollToTop: ({ animated }: { animated?: boolean } = {}) => {
        window.scrollTo({ top: 0, behavior: animated ? 'smooth' : 'auto' });
      },
      scrollToEnd: ({ animated }: { animated?: boolean } = {}) => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: animated ? 'smooth' : 'auto',
        });
      },
    }),
    [virtualizer, parentOffset],
  );

  // ---------------------------------------------------------------
  // Window scroll handler — synthesises an RN-shaped event and runs
  // the onEndReached gate.
  // ---------------------------------------------------------------
  const onScrollRef = useRef(onScroll);
  const onScrollBeginDragRef = useRef(onScrollBeginDrag);
  const onEndReachedRef = useRef(onEndReached);
  const onEndReachedThresholdRef = useRef(onEndReachedThreshold);
  useEffect(() => {
    onScrollRef.current = onScroll;
    onScrollBeginDragRef.current = onScrollBeginDrag;
    onEndReachedRef.current = onEndReached;
    onEndReachedThresholdRef.current = onEndReachedThreshold;
  }, [onScroll, onScrollBeginDrag, onEndReached, onEndReachedThreshold]);

  const beginDragFiredRef = useRef(false);
  const endReachedRef = useRef(false);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const handler = () => {
      const doc = document.documentElement;
      const event = {
        nativeEvent: {
          contentOffset: { x: window.scrollX, y: window.scrollY },
          contentSize: { width: doc.scrollWidth, height: doc.scrollHeight },
          layoutMeasurement: { width: window.innerWidth, height: window.innerHeight },
          contentInset: { top: 0, bottom: 0, left: 0, right: 0 },
          zoomScale: 1,
          velocity: { x: 0, y: 0 },
        },
      } as unknown as NativeSyntheticEvent<NativeScrollEvent>;
      onScrollRef.current?.(event);
      if (!beginDragFiredRef.current && onScrollBeginDragRef.current) {
        beginDragFiredRef.current = true;
        onScrollBeginDragRef.current(event);
      }
      const cb = onEndReachedRef.current;
      if (cb) {
        const distanceFromBottom = doc.scrollHeight - window.scrollY - window.innerHeight;
        const triggerDistance = window.innerHeight * onEndReachedThresholdRef.current;
        if (distanceFromBottom <= triggerDistance) {
          if (!endReachedRef.current) {
            endReachedRef.current = true;
            cb();
          }
        } else {
          endReachedRef.current = false;
        }
      }
      setAtTop(window.scrollY <= 0);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Reset begin-drag latch on pointer release.
  useEffect(() => {
    const reset = () => {
      beginDragFiredRef.current = false;
    };
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener('mouseup', reset, opts);
    window.addEventListener('touchend', reset, opts);
    return () => {
      window.removeEventListener('mouseup', reset);
      window.removeEventListener('touchend', reset);
    };
  }, []);

  // Re-check end-reached when items grow — the new tail may already be
  // within the trigger window.
  useLayoutEffect(() => {
    const cb = onEndReachedRef.current;
    if (!cb) return;
    const doc = document.documentElement;
    const distanceFromBottom = doc.scrollHeight - window.scrollY - window.innerHeight;
    const triggerDistance = window.innerHeight * onEndReachedThresholdRef.current;
    if (distanceFromBottom <= triggerDistance && !endReachedRef.current) {
      endReachedRef.current = true;
      cb();
    }
  }, [items.length]);

  // ---------------------------------------------------------------
  // Render — matches the docs window-list example structure.
  // ---------------------------------------------------------------
  const headerStyle = useMemo<React.CSSProperties>(() => {
    const shouldStick =
      stickyHeaderIndices === undefined
        ? Boolean(ListHeaderComponent)
        : stickyHeaderIndices.includes(0);
    return shouldStick ? { position: 'sticky', top: 0, zIndex: 2 } : {};
  }, [stickyHeaderIndices, ListHeaderComponent]);

  const outerCss = useMemo(
    () => StyleSheet.flatten(style) as React.CSSProperties | undefined,
    [style],
  );
  const innerCss = useMemo(
    () => StyleSheet.flatten(contentContainerStyle) as React.CSSProperties | undefined,
    [contentContainerStyle],
  );

  const isEmpty = items.length === 0;
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const handleItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) virtualizer.measureElement(node);
    },
    [virtualizer],
  );

  // Reserve the expected total height even before measurement so the
  // first paint matches the second paint's scrollable area; otherwise
  // the page grows by the full list height on the second render, which
  // can shift the scroll position and double the work the browser does.
  const reservedHeight = isMeasured ? totalSize : items.length * estimatedItemSize;

  const list = (
    <ComponentErrorBoundary>
      <div
        ref={setParentNode}
        style={{ width: '100%', flexShrink: 0, ...outerCss }}
      >
        <div style={{ flexShrink: 0, ...innerCss }}>
          {ListHeaderComponent ? (
            <div style={headerStyle}>
              <Slot component={ListHeaderComponent} />
            </div>
          ) : null}

          {isEmpty ? (
            <Slot component={ListEmptyComponent} />
          ) : (
            <VirtualizedListBody
              items={items}
              isMeasured={isMeasured}
              reservedHeight={reservedHeight}
              totalSize={totalSize}
              scrollMargin={virtualizer.options.scrollMargin}
              virtualItems={virtualItems}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              onItemRef={handleItemRef}
            />
          )}

          {ListFooterComponent ? <Slot component={ListFooterComponent} /> : null}
        </div>
      </div>
    </ComponentErrorBoundary>
  );

  if (onRefresh) {
    return (
      <WebPullToRefresh onRefresh={onRefresh} isPullable={atTop} refreshing={refreshing}>
        {list}
      </WebPullToRefresh>
    );
  }

  return list;
}
