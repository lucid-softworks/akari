import { router, usePathname } from 'expo-router';
import { Platform } from 'react-native';

type TabRoute = 'index' | 'notifications' | 'messages' | 'search' | 'bookmarks' | 'profile';

type PostNavigationArgs = {
  actor: string;
  rKey: string;
};

/**
 * Navigate to a post in the appropriate context
 * - Mobile: Uses tab-specific routes to maintain tab context
 * - Web: Uses top-level profile route
 */
function getTabRouteFromPathname(pathname: string): TabRoute {
  // Expo Router can surface paths with the (tabs) group prefix in some
  // contexts. Strip it so the prefix checks below still work.
  const p = pathname.replace(/^\/\(tabs\)/, '');

  if (p.startsWith('/notifications')) return 'notifications';
  if (p.startsWith('/messages')) return 'messages';
  if (p.startsWith('/search')) return 'search';
  if (p.startsWith('/bookmarks')) return 'bookmarks';
  if (p.startsWith('/profile')) return 'profile';
  // Index tab. Either '/' or '/index/...'. Also catch '/user-profile/...' which
  // is the runtime URL after Expo Router collapses the 'index' segment.
  if (p === '/' || p.startsWith('/index') || p.startsWith('/user-profile')) {
    return 'index';
  }
  // Unknown pathname — assume index tab rather than throwing so a transient
  // pathname during navigation can't crash the app.
  return 'index';
}

export function useNavigateToPost() {
  const pathname = usePathname() as string;

  return ({ actor, rKey }: PostNavigationArgs) => {
    if (Platform.OS === 'web') {
      router.push(`/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);

      if (targetTabRoute === 'profile') {
        router.push(`/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
      } else if (targetTabRoute === 'index') {
        // The home tab's nested user-profile routes live under
        // /(tabs)/index/user-profile/[handle], but Expo Router collapses the
        // 'index' segment so the runtime URL is /user-profile/<handle>.
        // @ts-expect-error collapsed-index-segment URL not in generated types
        router.push(`/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
      } else {
        router.push(`/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
      }
    }
  };
}

type ProfileNavigationArgs = {
  actor: string;
};

/**
 * Navigate to a profile in the appropriate context
 * - Mobile: Uses tab-specific routes to maintain tab context
 * - Web: Uses top-level profile route
 */
export function useNavigateToProfile() {
  const pathname = usePathname() as string;

  return ({ actor }: ProfileNavigationArgs) => {
    if (Platform.OS === 'web') {
      router.push(`/profile/${encodeURIComponent(actor)}`);
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);

      if (targetTabRoute === 'profile') {
        router.push(`/profile/${encodeURIComponent(actor)}`);
      } else if (targetTabRoute === 'index') {
        // @ts-expect-error collapsed-index-segment URL not in generated types
        router.push(`/user-profile/${encodeURIComponent(actor)}`);
      } else {
        router.push(`/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}`);
      }
    }
  };
}

/**
 * Build a tab-aware profile href. Mirrors useNavigateToProfile but returns the
 * URL string instead of pushing — useful with <Link> components.
 */
export function useProfileHref() {
  const pathname = usePathname() as string;

  return (actor: string): string => {
    if (Platform.OS === 'web') {
      return `/profile/${encodeURIComponent(actor)}`;
    }
    const targetTabRoute = getTabRouteFromPathname(pathname);
    if (targetTabRoute === 'profile') {
      return `/profile/${encodeURIComponent(actor)}`;
    }
    if (targetTabRoute === 'index') {
      // index tab's user-profile route is registered at /user-profile/<handle>
      // because Expo Router collapses the 'index' segment.
      return `/user-profile/${encodeURIComponent(actor)}`;
    }
    return `/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}`;
  };
}

// Export the TabRoute type for use in other files
export type { TabRoute };
