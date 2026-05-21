import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { zIndex } from '@/constants/tokens';

// React-DOM only exists in web bundles. require() keeps native bundlers
// from trying to resolve it; the require call only runs when we're on
// web and there's a document we can portal into.
type CreatePortalFn = (children: React.ReactNode, container: Element | DocumentFragment) => React.ReactPortal;
let cachedCreatePortal: CreatePortalFn | null = null;
function getCreatePortal(): CreatePortalFn | null {
  if (cachedCreatePortal) return cachedCreatePortal;
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reactDom = require('react-dom') as typeof import('react-dom');
    cachedCreatePortal = reactDom.createPortal as unknown as CreatePortalFn;
    return cachedCreatePortal;
  } catch {
    return null;
  }
}

export type WebPortalAnchorRect = {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export type WebPortalDropdownProps = {
  visible: boolean;
  anchorRect?: WebPortalAnchorRect | null;
  /** Estimated height used to decide whether to flip the menu above the
   *  anchor when there isn't room below. Doesn't need to be exact. */
  estimatedHeight: number;
  /** Called when an outside interaction (page scroll, viewport resize)
   *  invalidates the menu's anchored position. The menu uses
   *  `position: fixed` so the anchor scrolls away while the menu
   *  stays pinned — re-anchoring on scroll is jittery, so the
   *  standard UX is to dismiss instead (matches Twitter/GitHub/etc.).
   *  Optional: omit if the consumer wants the menu to stay open
   *  regardless. */
  onDismiss?: () => void;
  children: React.ReactNode;
};

/**
 * Renders its children into a fixed-position portal anchored to the
 * supplied trigger rect. The menu sizes to its content; we anchor its
 * right edge to the trigger's right edge using `right:` positioning, so
 * we don't need to know the menu's width ahead of time. Used for
 * dropdown menus that need to escape ancestor stacking contexts and
 * `overflow: hidden` (eg. items inside a virtualised feed list). Native
 * platforms have no DOM portal, so the component is a no-op there and
 * the caller should fall back to a Modal or sheet for native menus.
 */
export function WebPortalDropdown({
  visible,
  anchorRect,
  estimatedHeight,
  onDismiss,
  children,
}: WebPortalDropdownProps) {
  // Page-scroll / viewport-resize dismisses the menu so it doesn't
  // float disconnected from its trigger. Listen on `window` in the
  // capture phase so scrolling on a nested scroll container also
  // fires this (capture-phase scroll events bubble up from any
  // descendant). No-op without an `onDismiss` callback so consumers
  // can opt out by omitting the prop.
  useEffect(() => {
    if (!visible || !onDismiss) return;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handle = () => onDismiss();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [visible, onDismiss]);

  const position = useMemo(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    if (!anchorRect) {
      // Anchor wasn't measured (eg. caller didn't pass a rect). Drop the
      // menu in the top-right corner rather than refusing to render —
      // losing the anchor shouldn't mean losing the menu.
      return { top: 80, right: 16 };
    }
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    // Default to below; flip above only if there's not enough room AND
    // there's more room above.
    const flipUp = spaceBelow < estimatedHeight + 16 && anchorRect.top > spaceBelow;
    const top = flipUp
      ? Math.max(8, anchorRect.top - estimatedHeight - 8)
      : anchorRect.bottom + 6;
    // Align the menu's right edge with the trigger's right edge by
    // anchoring with `right:` (distance from viewport's right edge). Clamp
    // so the menu stays at least 8px inside the viewport.
    const right = Math.max(8, window.innerWidth - (anchorRect.left + anchorRect.width));
    return { top, right };
  }, [anchorRect, estimatedHeight]);

  const createPortal = getCreatePortal();
  if (!visible || !position || !createPortal) return null;

  return createPortal(
    <div
      role="menu"
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        width: 'max-content',
        maxWidth: 'calc(100vw - 16px)',
        zIndex: zIndex.dropdown,
      }}
      // Stop clicks inside the menu from bubbling to the document-level
      // dismiss handler that PostActionsMenu installs. The matching key
      // handler keeps jsx-a11y happy without changing behaviour.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
