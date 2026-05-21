import { router } from 'expo-router';
import { useCallback } from 'react';

import { useIsGuest } from '@/hooks/queries/useIsGuest';

/**
 * Helper for gating write affordances behind authentication. Returns
 * `{ isGuest, promptSignIn }`; component code looks like:
 *
 *   const { isGuest, promptSignIn } = useRequireAuth();
 *   const onLike = () => {
 *     if (isGuest) { promptSignIn(); return; }
 *     likePost.mutate(post);
 *   };
 *
 * We keep this as an explicit guard rather than wrapping the handler so
 * the call site stays legible and so each surface can decide whether to
 * also dim the icon, swap the label, hide it entirely, etc.
 *
 * `promptSignIn` routes to the sign-in landing screen. We don't queue
 * the pending action — by design — because mutating against a post a
 * user signs into 30 seconds later is more surprising than asking them
 * to tap "like" again on the now-signed-in client.
 */
export function useRequireAuth() {
  const isGuest = useIsGuest();
  const promptSignIn = useCallback(() => {
    router.push('/(auth)/signin');
  }, []);
  return { isGuest, promptSignIn };
}
