import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const INITIAL_BATCH = 5;
const BATCH_SIZE = 10;
const SCROLL_THRESHOLD = 0.7; // Load more when 70% scrolled

/**
 * Hook for progressively rendering items inside a parent ScrollView.
 *
 * VirtualizedList with scrollEnabled={false} inside a ScrollView defeats
 * virtualization -- it renders every item at once. This hook renders items
 * in batches instead, expanding as the user scrolls.
 *
 * Usage:
 *   const { visibleItems, onScroll } = useProgressiveList(allItems);
 *   // Pass onScroll to the parent ScrollView
 *   // Render visibleItems with .map()
 */
export function useProgressiveList<T>(
  items: T[],
  options?: {
    initialBatch?: number;
    batchSize?: number;
    onEndReached?: () => void;
  },
) {
  const initialBatch = options?.initialBatch ?? INITIAL_BATCH;
  const batchSize = options?.batchSize ?? BATCH_SIZE;
  const onEndReached = options?.onEndReached;

  const [visibleCount, setVisibleCount] = useState(initialBatch);
  const hasTriggeredEnd = useRef(false);

  // Reset visible count when items change (e.g. tab switch)
  useEffect(() => {
    setVisibleCount(initialBatch);
    hasTriggeredEnd.current = false;
  }, [items.length === 0, initialBatch]); // Reset when items go from 0 to non-zero or vice versa

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const scrollProgress = (contentOffset.y + layoutMeasurement.height) / contentSize.height;

      if (scrollProgress > SCROLL_THRESHOLD) {
        setVisibleCount((prev) => {
          const next = prev + batchSize;
          // If we've shown all local items and there are more to fetch
          if (next >= items.length && onEndReached && !hasTriggeredEnd.current) {
            hasTriggeredEnd.current = true;
            onEndReached();
            // Reset so it can trigger again after new items arrive
            setTimeout(() => {
              hasTriggeredEnd.current = false;
            }, 1000);
          }
          return Math.min(next, items.length);
        });
      }
    },
    [batchSize, items.length, onEndReached],
  );

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visibleItems, onScroll, hasMore };
}
