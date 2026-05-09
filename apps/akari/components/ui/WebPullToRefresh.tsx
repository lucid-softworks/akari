import type { PropsWithChildren } from 'react';

export type WebPullToRefreshProps = PropsWithChildren<{
  onRefresh?: (() => void) | (() => Promise<unknown>);
  refreshing?: boolean;
  isPullable?: boolean;
}>;

export function WebPullToRefresh({ children }: WebPullToRefreshProps) {
  return <>{children}</>;
}
