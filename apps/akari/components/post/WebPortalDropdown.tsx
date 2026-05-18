import React, { useMemo } from 'react';
import { Platform } from 'react-native';

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
  children,
}: WebPortalDropdownProps) {
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
        zIndex: 9999,
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
