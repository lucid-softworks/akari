import type React from 'react';

export type ProfileTabContentProps = {
  /** ProfileHeader (avatar, banner, follow counts). Rendered as item index 0. */
  ListHeaderComponent?: React.ReactElement | null;
  /** Tab strip. Rendered as item index 1, sticky to viewport top. */
  StickyTabComponent?: React.ReactElement | null;
  /** When true, scroll the FlatList to put the sticky tab strip at the top on mount. */
  pinTabsOnMount?: boolean;
  /** Pull-to-refresh callback (used on the own-profile screen). */
  onRefresh?: () => void;
  refreshing?: boolean;
};
