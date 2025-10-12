import { useTabContext } from '@/contexts/TabContext';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

export function useTabRouteTracker() {
  const pathname = usePathname();
  const { getCurrentTabFromPath, updateTabState } = useTabContext();
  const lastPathnameRef = useRef<string>('');

  useEffect(() => {
    // Only update if the pathname actually changed
    if (pathname === lastPathnameRef.current) {
      return;
    }

    lastPathnameRef.current = pathname;

    // Get the current tab from the path
    const currentTab = getCurrentTabFromPath(pathname);

    if (currentTab) {
      // Update the tab state to remember this route
      updateTabState(currentTab, pathname);
    }
  }, [pathname]); // Only depend on pathname to avoid infinite loops
}
