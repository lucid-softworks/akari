import { useCallback, useEffect, useMemo, useRef } from 'react';
import { router, useGlobalSearchParams, useSegments } from 'expo-router';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

export type TabRouteKey =
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

type SharedRouteKey = 'post' | 'profile';

export const TAB_PATHS: Record<TabRouteKey, string> = {
  index: '/',
  search: '/search',
  messages: '/messages',
  notifications: '/notifications',
  bookmarks: '/bookmarks',
  profile: '/profile',
  settings: '/settings',
};

const SHARED_POST_PATH = '/post/[id]' as const;
const SHARED_PROFILE_PATH = '/profile/[handle]' as const;

type UseTabNavigationResult = {
  activeTab: TabRouteKey;
  isSharedRouteFocused: boolean;
  navigateToTabRoot: (tab?: TabRouteKey) => void;
  openPost: (postUri: string, options?: NavigateOptions) => void;
  openProfile: (handle: string, options?: NavigateOptions) => void;
};

function resolveTabFromSegments(segments: string[]): TabRouteKey | undefined {
  for (const segment of segments) {
    if (TAB_ROUTE_KEYS.includes(segment as TabRouteKey)) {
      return segment as TabRouteKey;
    }

    if (segment.startsWith('(') && segment.endsWith(')')) {
      const normalized = segment.slice(1, -1);
      if (TAB_ROUTE_KEYS.includes(normalized as TabRouteKey)) {
        return normalized as TabRouteKey;
      }
    }
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

  const activeSharedRoute = useMemo(() => {
    const firstSegment = segments[0];
    if (firstSegment === 'post' || firstSegment === 'profile') {
      return firstSegment as SharedRouteKey;
    }

    if (!segmentTab) {
      return undefined;
    }

    const tabSegmentIndex = segments.findIndex((segment) => {
      if (segment === segmentTab) {
        return true;
      }

      if (segment.startsWith('(') && segment.endsWith(')')) {
        const normalized = segment.slice(1, -1);
        return normalized === segmentTab;
      }

      return false;
    });

    if (tabSegmentIndex === -1) {
      return undefined;
    }

    const nextSegment = segments[tabSegmentIndex + 1];
    if (nextSegment === 'post' || nextSegment === 'profile') {
      return nextSegment as SharedRouteKey;
    }

    return undefined;
  }, [segmentTab, segments]);

  const resolveNavigationTarget = useCallback(
    (options?: NavigateOptions) => options?.tab ?? activeTab,
    [activeTab],
  );

  const navigateToTabRoot = useCallback(
    (tab?: TabRouteKey) => {
      const targetTab = tab ?? activeTab;
      router.navigate(TAB_PATHS[targetTab]);
    },
    [activeTab],
  );

  const openPost = useCallback(
    (postUri: string, options?: NavigateOptions) => {
      const targetTab = resolveNavigationTarget(options);
      const action = options?.replace ? router.replace : router.push;

      action({
        pathname: SHARED_POST_PATH,
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
        action(TAB_PATHS.profile);
        return;
      }

      const targetTab = resolveNavigationTarget(options);
      const action = options?.replace ? router.replace : router.push;

      action({
        pathname: SHARED_PROFILE_PATH,
        params: { handle: normalizedHandle, tab: targetTab },
      });
    },
    [currentAccount?.handle, resolveNavigationTarget],
  );

  return {
    activeTab,
    isSharedRouteFocused: Boolean(activeSharedRoute),
    navigateToTabRoot,
    openPost,
    openProfile,
  };
}

