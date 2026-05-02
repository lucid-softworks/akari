import type React from 'react';

export type ProfileTabContentProps = {
  /** ProfileHeader (avatar, banner, follow counts). Rendered as item index 0. */
  ListHeaderComponent?: React.ReactElement | null;
  /** Tab strip. Rendered as item index 1, sticky to viewport top. */
  StickyTabComponent?: React.ReactElement | null;
  /** When true, scroll the FlatList to put the sticky tab strip at the top on mount. */
  pinTabsOnMount?: boolean;
  /**
   * Optional: refresh profile-level data (banner, name, follow counts). Composed
   * with the tab's own data refetch when the user pulls to refresh.
   */
  onProfileRefresh?: () => Promise<void> | void;
};
