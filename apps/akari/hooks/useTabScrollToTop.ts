import { useCallback } from 'react';

/**
 * Simple hook for tab scroll-to-top functionality
 * @param scrollToTop - Function to scroll to top of the current screen
 * @returns Function to call when tab is pressed (will trigger scroll if same tab pressed twice)
 */
export function useTabScrollToTop(scrollToTop: () => void) {
  const handleTabPress = useCallback(() => {
    // Same tab pressed twice, scroll to top
    scrollToTop?.();
  }, [scrollToTop]);

  return handleTabPress;
}
