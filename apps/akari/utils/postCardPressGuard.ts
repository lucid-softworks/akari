/**
 * Shared guard that lets interactive content nested *inside* a PostCard's
 * navigating Pressable (e.g. a feed image opening the Lightbox) reliably
 * suppress the card's navigation on web.
 *
 * On React Native Web, nested-Pressable `event.stopPropagation()` does not
 * reliably stop the outer Pressable's press — both the inner press and the
 * card navigation can fire for a single tap, so opening the lightbox and
 * pushing the post route race (the user sees a coin-flip between the two).
 * The inner element marks a short suppression window on press-in (which
 * always fires before the outer press-release), and the card press checks
 * it before navigating. Mirrors the module-scope timestamp idiom already
 * used for press debouncing in PressableLink.
 */
let suppressUntil = 0;
const SUPPRESS_WINDOW_MS = 350;

/** Call from an inner element's `onPressIn` to block the next card navigation. */
export function suppressCardPress(): void {
  suppressUntil = Date.now() + SUPPRESS_WINDOW_MS;
}

/** True if an inner element just claimed the press; the card should not navigate. */
export function isCardPressSuppressed(): boolean {
  return Date.now() < suppressUntil;
}
