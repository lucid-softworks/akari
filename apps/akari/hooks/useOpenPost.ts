import { useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';

export function useOpenPost() {
  const router = useRouter();
  const segments = useSegments();

  return useCallback(
    (uri: string | null | undefined) => {
      if (!uri) {
        return;
      }

      const encodedId = encodeURIComponent(uri);
      const hasTabsGroup = segments[0] === '(tabs)';
      const tabSegment = hasTabsGroup ? segments[1] : undefined;

      if (hasTabsGroup && tabSegment) {
        router.push(`/(tabs)/${tabSegment}/post/${encodedId}`);
        return;
      }

      if (hasTabsGroup) {
        router.push(`/(tabs)/post/${encodedId}`);
        return;
      }

      router.push(`/post/${encodedId}`);
    },
    [router, segments],
  );
}
