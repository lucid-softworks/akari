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
  if (pathname.startsWith('/notifications')) {
    return 'notifications';
  } else if (pathname.startsWith('/messages')) {
    return 'messages';
  } else if (pathname.startsWith('/search')) {
    return 'search';
  } else if (pathname.startsWith('/bookmarks')) {
    return 'bookmarks';
  } else if (pathname.startsWith('/profile')) {
    return 'profile';
  } else if (pathname.startsWith('/index') || pathname === '/') {
    return 'index';
  } else {
    throw new Error(
      `Unknown pathname: ${pathname}. Expected one of: /, /index, /notifications, /messages, /search, /bookmarks, /profile`,
    );
  }
}

export function useNavigateToPost() {
  const pathname = usePathname() as string;

  return ({ actor, rKey }: PostNavigationArgs) => {
    if (Platform.OS === 'web') {
      router.push(`/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);

      if (targetTabRoute === 'index') {
        router.push(`./user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}` as const);
      } else if (targetTabRoute === 'profile') {
        router.push(`/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
      } else {
        router.push(`/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`);
      }
    }
  };
}

// Export the TabRoute type for use in other files
export type { TabRoute };
