import { useCallback, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import PullToRefresh from 'react-simple-pull-to-refresh';

export type WebPullToRefreshProps = PropsWithChildren<{
  onRefresh?: (() => void) | (() => Promise<unknown>);
  /** When false, the wrapped list isn't at scrollTop=0, so the gesture
   *  must be ignored to avoid triggering a refresh while the user is
   *  just scrolling within the list. */
  isPullable?: boolean;
}>;

export function WebPullToRefresh({ onRefresh, isPullable = true, children }: WebPullToRefreshProps) {
  const [busy, setBusy] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }, [onRefresh]);

  if (!onRefresh) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1 }}>
      <PullToRefresh
        isPullable={isPullable && !busy}
        onRefresh={handleRefresh}
        pullingContent=""
      >
        <>{children}</>
      </PullToRefresh>
    </View>
  );
}
