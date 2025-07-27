import React, { createContext, useContext, useRef } from "react";

type ScrollToTopHandler = () => void;

type TabScrollContextType = {
  registerScrollHandler: (tabName: string, handler: ScrollToTopHandler) => void;
  getScrollHandler: (tabName: string) => ScrollToTopHandler | undefined;
  setCurrentTab: (tabName: string) => void;
  isCurrentTab: (tabName: string) => boolean;
};

export const TabScrollContext = createContext<TabScrollContextType | null>(
  null
);

/**
 * Provider component for tab scroll functionality
 */
export function TabScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollHandlersRef = useRef<Record<string, ScrollToTopHandler>>({});
  const currentTabRef = useRef<string | null>(null);
  const lastPressTimeRef = useRef<number>(0);

  const registerScrollHandler = (
    tabName: string,
    handler: ScrollToTopHandler
  ) => {
    console.log("Registering scroll handler for tab:", tabName);
    scrollHandlersRef.current[tabName] = handler;
  };

  const getScrollHandler = (tabName: string) => {
    const handler = scrollHandlersRef.current[tabName];
    console.log(
      "Getting scroll handler for tab:",
      tabName,
      "found:",
      !!handler
    );
    return handler;
  };

  const setCurrentTab = (tabName: string) => {
    console.log("Setting current tab to:", tabName);
    currentTabRef.current = tabName;
  };

  const isCurrentTab = (tabName: string) => {
    const now = Date.now();
    const isCurrent = currentTabRef.current === tabName;
    const timeSinceLastPress = now - lastPressTimeRef.current;

    console.log(
      "Checking if current tab:",
      tabName,
      "is current:",
      isCurrent,
      "time since last press:",
      timeSinceLastPress
    );

    // If this is the current tab and it was pressed recently, trigger scroll
    if (isCurrent && timeSinceLastPress < 500) {
      const handler = getScrollHandler(tabName);
      if (handler) {
        console.log("Triggering scroll to top for:", tabName);
        handler();
      }
    }

    lastPressTimeRef.current = now;
    return isCurrent;
  };

  return (
    <TabScrollContext.Provider
      value={{
        registerScrollHandler,
        getScrollHandler,
        setCurrentTab,
        isCurrentTab,
      }}
    >
      {children}
    </TabScrollContext.Provider>
  );
}

/**
 * Hook to use the tab scroll context
 */
export function useTabScrollContext() {
  const context = useContext(TabScrollContext);
  if (!context) {
    throw new Error(
      "useTabScrollContext must be used within a TabScrollProvider"
    );
  }
  return context;
}
