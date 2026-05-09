import type { PropsWithChildren } from 'react';

export type WebPullToRefreshProps = PropsWithChildren<{
  onRefresh?: (() => void) | (() => Promise<unknown>);
  refreshing?: boolean;
}>;

export function WebPullToRefresh({ children }: WebPullToRefreshProps) {
  return <>{children}</>;
}
