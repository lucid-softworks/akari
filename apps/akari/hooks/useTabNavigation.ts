import { useCallback, useEffect, useMemo, useRef } from 'react';
import { router, useGlobalSearchParams, useSegments } from 'expo-router';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

type TabRouteKey =
  | 'index'
  | 'search'
  | 'messages'
  | 'notifications'
  | 'bookmarks'
  | 'profile'
  | 'settings';

const TAB_ROUTE_KEYS: TabRouteKey[] = [
  'index',
  'search',
  'messages',
  'notifications',
  'bookmarks',
  'profile',
  'settings',
];

type NavigateOptions = {
  tab?: TabRouteKey;
  replace?: boolean;
};

type UseTabNavigationResult = {
  activeTab: TabRouteKey;
  openPost: (postUri: string, options?: NavigateOptions) => void;
  openProfile: (handle: string, options?: NavigateOptions) => void;
};

function resolveTabFromSegments(segments: string[]): TabRouteKey | undefined {
  const candidate = segments[1];
  if (candidate && TAB_ROUTE_KEYS.includes(candidate as TabRouteKey)) {
    return candidate as TabRouteKey;
  }

  return undefined;
}

function normalizeHandle(handle: string): string {
  if (handle.startsWith('@')) {
    return handle.slice(1);
  }

  return handle;
}

export function useTabNavigation(): UseTabNavigationResult {
  const segments = useSegments();
  const globalParams = useGlobalSearchParams<{ tab?: string }>();
  const { data: currentAccount } = useCurrentAccount();

  const lastKnownTabRef = useRef<TabRouteKey>('index');

  const segmentTab = useMemo(() => resolveTabFromSegments(segments), [segments]);

  useEffect(() => {
    if (segmentTab) {
      lastKnownTabRef.current = segmentTab;
    }
  }, [segmentTab]);

  const activeTab = useMemo(() => {
    if (segmentTab) {
      return segmentTab;
    }

    const queryTab = globalParams.tab;
    if (typeof queryTab === 'string' && TAB_ROUTE_KEYS.includes(queryTab as TabRouteKey)) {
      return queryTab as TabRouteKey;
    }

    return lastKnownTabRef.current;
  }, [globalParams.tab, segmentTab]);

  const resolveNavigationTarget = useCallback(
    (options?: NavigateOptions) => options?.tab ?? activeTab,
    [activeTab],
  );

  const openPost = useCallback(
    (postUri: string, options?: NavigateOptions) => {
      const targetTab = resolveNavigationTarget(options);
      const action = options?.replace ? router.replace : router.push;

      action({
        pathname: '/(tabs)/post/[id]',
        params: { id: postUri, tab: targetTab },
      });
    },
    [resolveNavigationTarget],
  );

  const openProfile = useCallback(
    (handle: string, options?: NavigateOptions) => {
      const normalizedHandle = normalizeHandle(handle);
      const isCurrentUser = normalizedHandle === currentAccount?.handle;

      if (isCurrentUser) {
        const action = options?.replace ? router.replace : router.push;
        action('/(tabs)/profile');
        return;
      }

      const targetTab = resolveNavigationTarget(options);
      const action = options?.replace ? router.replace : router.push;

      action({
        pathname: '/(tabs)/profile/[handle]',
        params: { handle: normalizedHandle, tab: targetTab },
      });
    },
    [currentAccount?.handle, resolveNavigationTarget],
  );

  return {
    activeTab,
    openPost,
    openProfile,
  };
}

