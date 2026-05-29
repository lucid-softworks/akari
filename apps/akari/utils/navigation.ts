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

const isSamePath = (target: string, current: string) =>
  target.split('?')[0].split('#')[0] === current.split('?')[0].split('#')[0];

export function useNavigateToPost() {
  const pathname = usePathname() as string;

  return ({ actor, rKey }: PostNavigationArgs) => {
    let target: string;
    if (Platform.OS === 'web') {
      target = `/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`;
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);
      if (targetTabRoute === 'profile') {
        target = `/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`;
      } else if (targetTabRoute === 'index') {
        // The home tab's nested user-profile routes live under
        // /(tabs)/index/user-profile/[handle], but Expo Router collapses the
        // 'index' segment so the runtime URL is /user-profile/<handle>.
        target = `/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`;
      } else {
        target = `/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(rKey)}`;
      }
    }

    if (isSamePath(target, pathname)) return;
    // collapsed-index-segment URL isn't modeled in the generated route types
    router.push(target as never);
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
    let target: string;
    if (Platform.OS === 'web') {
      target = `/profile/${encodeURIComponent(actor)}`;
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);
      if (targetTabRoute === 'profile') {
        target = `/profile/${encodeURIComponent(actor)}`;
      } else if (targetTabRoute === 'index') {
        target = `/user-profile/${encodeURIComponent(actor)}`;
      } else {
        target = `/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}`;
      }
    }

    if (isSamePath(target, pathname)) return;
    // collapsed-index-segment URL isn't modeled in the generated route types
    router.push(target as never);
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

type FeedNavigationArgs = {
  /** Handle or DID of the feed-generator's owner. */
  actor: string;
  /** Record-key of the `app.bsky.feed.generator` record. */
  rKey: string;
};

/**
 * Navigate to a feed-generator detail screen — same tab-aware shape as
 * post / profile navigation. Web uses `/profile/<actor>/feed/<rKey>`;
 * native picks the per-tab variant so the back-swipe lands inside the
 * tab the user came from.
 */
export function useNavigateToFeed() {
  const pathname = usePathname() as string;

  return ({ actor, rKey }: FeedNavigationArgs) => {
    let target: string;
    if (Platform.OS === 'web') {
      target = `/profile/${encodeURIComponent(actor)}/feed/${encodeURIComponent(rKey)}`;
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);
      if (targetTabRoute === 'profile') {
        target = `/profile/${encodeURIComponent(actor)}/feed/${encodeURIComponent(rKey)}`;
      } else if (targetTabRoute === 'index') {
        target = `/user-profile/${encodeURIComponent(actor)}/feed/${encodeURIComponent(rKey)}`;
      } else {
        target = `/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}/feed/${encodeURIComponent(rKey)}`;
      }
    }

    if (isSamePath(target, pathname)) return;
    // collapsed-index-segment URL isn't modeled in the generated route types
    router.push(target as never);
  };
}

type GalleryNavigationArgs = {
  /** Handle or DID of the gallery's owner. */
  actor: string;
  /** Record-key of the `social.grain.gallery` record. */
  rKey: string;
};

/**
 * Navigate to a grain.social gallery detail screen — same tab-aware
 * shape as post / feed navigation. Web uses
 * `/profile/<actor>/gallery/<rKey>`; native picks the per-tab variant
 * so the back-swipe lands inside the tab the user came from.
 */
export function useNavigateToGallery() {
  const pathname = usePathname() as string;

  return ({ actor, rKey }: GalleryNavigationArgs) => {
    let target: string;
    if (Platform.OS === 'web') {
      target = `/profile/${encodeURIComponent(actor)}/gallery/${encodeURIComponent(rKey)}`;
    } else {
      const targetTabRoute = getTabRouteFromPathname(pathname);
      if (targetTabRoute === 'profile') {
        target = `/profile/${encodeURIComponent(actor)}/gallery/${encodeURIComponent(rKey)}`;
      } else if (targetTabRoute === 'index') {
        target = `/user-profile/${encodeURIComponent(actor)}/gallery/${encodeURIComponent(rKey)}`;
      } else {
        target = `/${targetTabRoute}/user-profile/${encodeURIComponent(actor)}/gallery/${encodeURIComponent(rKey)}`;
      }
    }

    if (isSamePath(target, pathname)) return;
    // collapsed-index-segment URL isn't modeled in the generated route types
    router.push(target as never);
  };
}

// Export the TabRoute type for use in other files
export type { TabRoute };
