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
  bodyCssText: string;
  scrollY: number;
} | null = null;

function applyLock() {
  if (lockCount === 0) {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    saved = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyCssText: document.body.style.cssText,
      scrollY,
    };
    // `overflow: hidden` on documentElement and body covers desktop
    // browsers that scroll either element. `position: fixed` covers
    // iOS Safari, which ignores overflow:hidden — we pin the body to
    // its current scroll offset so the visual position doesn't jump.
    // Body mutations are batched into a single `cssText` write; the
    // html write below targets a different element so it can't merge.
    // oxlint-disable-next-line react-doctor/js-batch-dom-css -- separate elements (html vs body), can't merge into one cssText
    document.documentElement.style.overflow = 'hidden';
    // oxlint-disable-next-line react-doctor/js-batch-dom-css -- already a single cssText write; the only other mutation is on a different element (html)
    document.body.style.cssText +=
      `;overflow:hidden;position:fixed;top:-${scrollY}px;width:100%`;
  }
  lockCount += 1;
}

function releaseLock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0 && saved) {
    const { htmlOverflow, bodyCssText, scrollY } = saved;
    // oxlint-disable-next-line react-doctor/js-batch-dom-css -- separate elements (html vs body), can't merge into one cssText
    document.documentElement.style.overflow = htmlOverflow;
    // oxlint-disable-next-line react-doctor/js-batch-dom-css -- already a single cssText write; the only other mutation is on a different element (html)
    document.body.style.cssText = bodyCssText;
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
