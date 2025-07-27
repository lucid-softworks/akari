import { useCallback, useRef } from "react";

/**
 * Simple hook for tab scroll-to-top functionality
 * @param scrollToTop - Function to scroll to top of the current screen
 * @returns Function to call when tab is pressed (will trigger scroll if same tab pressed twice)
 */
export function useTabScrollToTop(scrollToTop: () => void) {
  const lastPressedTimeRef = useRef<number>(0);

  const handleTabPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastPressedTimeRef.current;

    // If pressed again within 500ms, trigger scroll to top
    if (timeSinceLastPress < 500) {
      console.log("Same tab pressed twice, scrolling to top");
      scrollToTop();
    }

    lastPressedTimeRef.current = now;
  }, [scrollToTop]);

  return handleTabPress;
}
