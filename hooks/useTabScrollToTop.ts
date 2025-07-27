import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

/**
 * Custom hook to handle scroll-to-top functionality when pressing the active tab
 * @param scrollToTop - Function to scroll to top of the current screen
 */
export function useTabScrollToTop(scrollToTop: () => void) {
  const isFocusedRef = useRef(false);
  const lastTabPressTimeRef = useRef(0);

  // Track when the screen is focused
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
      };
    }, [])
  );

  // Function to handle tab press - should be called from the tab button
  const handleTabPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastTabPressTimeRef.current;

    // If we're already on this tab and it's been pressed again within 500ms
    if (isFocusedRef.current && timeSinceLastPress < 500) {
      scrollToTop();
    }

    lastTabPressTimeRef.current = now;
  }, [scrollToTop]);

  return { handleTabPress };
}
