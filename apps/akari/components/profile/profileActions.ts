import { router } from 'expo-router';

type SearchProfilePostsOptions = {
  handle?: string | null;
  onComplete?: () => void;
};

export function searchProfilePosts({ handle, onComplete }: SearchProfilePostsOptions) {
  if (handle) {
    router.push(`/(tabs)/search?query=from:${handle}`);
  }

  onComplete?.();
}
