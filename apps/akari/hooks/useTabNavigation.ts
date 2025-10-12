import { useTabContext } from '@/contexts/TabContext';
import { usePathname, useRouter } from 'expo-router';

// Extract the record key (last segment) from an AT URI
function extractRecordKey(uri: string): string {
  // If it's already just a record key (no at:// prefix), return as is
  if (!uri.startsWith('at://')) {
    return uri;
  }

  // Extract the last segment after the final slash
  const segments = uri.split('/');
  return segments[segments.length - 1];
}

export function useTabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { setActiveTab, getCurrentTabFromPath, updateTabState } = useTabContext();

  const navigateToPost = (postId: string, handle?: string) => {
    // Get current tab from path
    const currentTab = getCurrentTabFromPath(pathname) || 'index';

    // Set the active tab before navigating
    setActiveTab(currentTab);

    // Extract just the record key from the post ID
    const recordKey = extractRecordKey(postId);

    let targetRoute: string;
    if (handle) {
      // Navigate to profile post route: /profile/$handle/post/$recordKey
      targetRoute = `/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordKey)}`;
    } else {
      // Fallback to shared post route
      targetRoute = `/post/${encodeURIComponent(recordKey)}`;
    }

    // Debug logging
    console.log(
      `navigateToPost - postId: ${postId}, handle: ${handle}, recordKey: ${recordKey}, targetRoute: ${targetRoute}`,
    );

    // Update the tab state to remember this navigation
    updateTabState(currentTab, targetRoute);

    // Navigate to the post
    // Always use push when navigating within a tab to maintain proper navigation stack
    router.push(targetRoute);
  };

  return { navigateToPost };
}
