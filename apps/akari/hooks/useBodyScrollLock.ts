import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Locks `document.body` scrolling on web while at least one consumer of
 * this hook is mounted. No-op on native — the platform `<Modal>` already
 * suppresses underlying touches there.
 *
 * Nested modals are handled with a refcount: the second open layers on
 * top without restoring scroll when one (but not both) unmounts. We
 * stash the original `overflow` value the first time we engage so a
 * page that intentionally sets a non-default overflow at boot keeps
 * that value after the last modal closes.
 */
let lockCount = 0;
let originalOverflow: string | null = null;

function applyLock() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function releaseLock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow ?? '';
    originalOverflow = null;
  }
}

export function useBodyScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    applyLock();
    return () => releaseLock();
  }, [enabled]);
}
