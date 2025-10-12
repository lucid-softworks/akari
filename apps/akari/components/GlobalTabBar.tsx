import { usePathname } from 'expo-router';
import React from 'react';

import { useTabContext } from '@/contexts/TabContext';
import { useResponsive } from '@/hooks/useResponsive';

type GlobalTabBarProps = {
  children: React.ReactNode;
};

export function GlobalTabBar({ children }: GlobalTabBarProps) {
  const pathname = usePathname();
  const { isLargeScreen } = useResponsive();
  const { getCurrentTabFromPath } = useTabContext();

  // Don't show tab bar on auth routes or debug
  if (pathname.startsWith('/(auth)') || pathname.startsWith('/debug')) {
    return <>{children}</>;
  }

  // For large screens, we don't need the tab bar as they use the sidebar
  if (isLargeScreen) {
    return <>{children}</>;
  }

  // For mobile, we need to show the tab bar on all routes
  // The tab bar will be rendered by the tabs layout
  return <>{children}</>;
}
