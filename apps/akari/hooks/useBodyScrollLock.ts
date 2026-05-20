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
let saved: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  scrollY: number;
} | null = null;

function applyLock() {
  if (lockCount === 0) {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    saved = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      scrollY,
    };
    // `overflow: hidden` on documentElement and body covers desktop
    // browsers that scroll either element. `position: fixed` covers
    // iOS Safari, which ignores overflow:hidden — we pin the body to
    // its current scroll offset so the visual position doesn't jump.
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  }
  lockCount += 1;
}

function releaseLock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0 && saved) {
    const { htmlOverflow, bodyOverflow, bodyPosition, bodyTop, bodyWidth, scrollY } = saved;
    document.documentElement.style.overflow = htmlOverflow;
    document.body.style.overflow = bodyOverflow;
    document.body.style.position = bodyPosition;
    document.body.style.top = bodyTop;
    document.body.style.width = bodyWidth;
    // Restore the scroll position the lock froze us at. Without this
    // the page would jump to top when the body's `position: fixed`
    // comes off.
    window.scrollTo(0, scrollY);
    saved = null;
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
