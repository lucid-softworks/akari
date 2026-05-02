import type React from 'react';

export type ProfileTabContentProps = {
  /** ProfileHeader (avatar, banner, follow counts). Rendered as item index 0. */
  ListHeaderComponent?: React.ReactElement | null;
  /** Tab strip. Rendered as item index 1, sticky to viewport top. */
  StickyTabComponent?: React.ReactElement | null;
  /** Scroll Y to land at when this tab becomes active. Used to preserve the
   * user's vertical position across tab switches. 0 (or undefined) = top. */
  pinScrollY?: number;
  /** True iff this tab is currently the visible active tab. */
  isActive?: boolean;
  /**
   * Optional: refresh profile-level data (banner, name, follow counts). Composed
   * with the tab's own data refetch when the user pulls to refresh.
   */
  onProfileRefresh?: () => Promise<void> | void;
  /** Reports the current scroll Y to the parent so it can decide whether to
   * pin the sticky tab strip on the next tab switch. */
  onScrollY?: (y: number) => void;
  /** Reports the measured ProfileHeader pixel height to the parent. */
  onHeaderHeightChange?: (h: number) => void;
};
