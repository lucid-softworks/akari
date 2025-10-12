import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useCurrentAccount } from '../hooks/queries/useCurrentAccount';

type TabNavigationState = {
  currentRoute: string;
  history: string[];
};

type TabContextType = {
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  getCurrentTabFromPath: (path: string) => string | null;
  tabStates: Record<string, TabNavigationState>;
  updateTabState: (tab: string, route: string) => void;
  goBackInTab: (tab: string) => string | null;
  getTabCurrentRoute: (tab: string) => string;
  navigateToTab: (tab: string) => string;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

// Define the tab names as an array for easy access
export const TAB_NAMES = ['index', 'search', 'messages', 'notifications', 'profile', 'settings'] as const;
export type TabName = (typeof TAB_NAMES)[number];

export function TabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<string | null>('index');
  const { data: currentAccount } = useCurrentAccount();

  // Initialize tab states with their default routes
  const [tabStates, setTabStates] = useState<Record<string, TabNavigationState>>({
    index: { currentRoute: '/', history: ['/'] },
    search: { currentRoute: '/search', history: ['/search'] },
    messages: { currentRoute: '/messages', history: ['/messages'] },
    notifications: { currentRoute: '/notifications', history: ['/notifications'] },
    profile: { currentRoute: '/profile/', history: ['/profile/'] },
    settings: { currentRoute: '/settings', history: ['/settings'] },
  });

  // Update profile route when current account changes
  useEffect(() => {
    if (currentAccount?.handle) {
      const profileRoute = `/profile/${currentAccount.handle}`;
      setTabStates((prev) => ({
        ...prev,
        profile: { currentRoute: profileRoute, history: [profileRoute] },
      }));
    }
  }, [currentAccount?.handle]);

  const getCurrentTabFromPath = (path: string): string | null => {
    // Handle root route as home tab
    if (path === '/' || path === '/index') {
      return 'index';
    }

    // Handle profile routes (both /profile/ and /profile/[handle])
    if (path.startsWith('/profile')) {
      return 'profile';
    }

    // Extract tab name from direct path like /search
    const match = path.match(/\/([^\/]+)/);
    if (match && TAB_NAMES.includes(match[1] as TabName)) {
      return match[1];
    }
    return null;
  };

  const updateTabState = useCallback((tab: string, route: string) => {
    setTabStates((prev) => {
      const currentState = prev[tab] || { currentRoute: `/${tab}`, history: [`/${tab}`] };

      // Don't update if the route is the same
      if (currentState.currentRoute === route) {
        return prev;
      }

      return {
        ...prev,
        [tab]: {
          currentRoute: route,
          history: [...currentState.history, route].slice(-10), // Keep last 10 routes
        },
      };
    });
  }, []);

  const getTabCurrentRoute = useCallback(
    (tab: string) => {
      return tabStates[tab]?.currentRoute || (tab === 'profile' ? `/profile/${currentAccount?.handle || ''}` : `/${tab}`);
    },
    [tabStates, currentAccount?.handle],
  );

  const goBackInTab = useCallback((tab: string) => {
    let previousRoute: string | null = null;

    setTabStates((prev) => {
      const currentState = prev[tab];
      if (!currentState || currentState.history.length <= 1) {
        return prev; // Can't go back further
      }

      // Remove the last route from history and set the previous one as current
      const newHistory = currentState.history.slice(0, -1);
      previousRoute = newHistory[newHistory.length - 1];

      return {
        ...prev,
        [tab]: {
          currentRoute: previousRoute,
          history: newHistory,
        },
      };
    });

    return previousRoute;
  }, []);

  const navigateToTab = useCallback(
    (tab: string) => {
      // Navigate to the tab's last remembered route
      // The AppTabBar will use router.replace() to avoid stack navigation animations
      const route = getTabCurrentRoute(tab);
      setActiveTab(tab);
      return route;
    },
    [getTabCurrentRoute],
  );

  return (
    <TabContext.Provider
      value={{
        activeTab,
        setActiveTab,
        getCurrentTabFromPath,
        tabStates,
        updateTabState,
        goBackInTab,
        getTabCurrentRoute,
        navigateToTab,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
}
