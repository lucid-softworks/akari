import { useCallback, useMemo } from 'react';
import { router, useSegments } from 'expo-router';

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

function resolveTabFromSegments(segments: string[]): TabRouteKey {
  const candidate = segments[1];
  if (candidate && TAB_ROUTE_KEYS.includes(candidate as TabRouteKey)) {
    return candidate as TabRouteKey;
  }

  return 'index';
}

function normalizeHandle(handle: string): string {
  if (handle.startsWith('@')) {
    return handle.slice(1);
  }

  return handle;
}

export function useTabNavigation(): UseTabNavigationResult {
  const segments = useSegments();
  const { data: currentAccount } = useCurrentAccount();

  const activeTab = useMemo(() => resolveTabFromSegments(segments), [segments]);

  const buildTabPath = useCallback(
    (tab: TabRouteKey, leafPath?: string) =>
      leafPath && leafPath.length > 0 ? `/(tabs)/${tab}/${leafPath}` : `/(tabs)/${tab}`,
    [],
  );

  const navigate = useCallback(
    (leafPath: string, params: Record<string, string>, options?: NavigateOptions) => {
      const targetTab = options?.tab ?? activeTab;
      const action = options?.replace ? router.replace : router.push;

      action({
        pathname: buildTabPath(targetTab, leafPath),
        params,
      });
    },
    [activeTab, buildTabPath],
  );

  const openPost = useCallback(
    (postUri: string, options?: NavigateOptions) => {
      navigate('post/[id]', { id: postUri }, options);
    },
    [navigate],
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

      const targetTab = options?.tab ?? activeTab;
      const leafPath = targetTab === 'profile' ? '[handle]' : 'profile/[handle]';

      navigate(leafPath, { handle: normalizedHandle }, { ...options, tab: targetTab });
    },
    [activeTab, currentAccount?.handle, navigate],
  );

  return {
    activeTab,
    openPost,
    openProfile,
  };
}

