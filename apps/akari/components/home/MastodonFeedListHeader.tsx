import React from 'react';

import { TabBar } from '@/components/TabBar';
import { ThemedView } from '@/components/ThemedView';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useBorderColor } from '@/hooks/useBorderColor';

export type MastodonFeedTab = { key: string; label: string };

type MastodonFeedListHeaderProps = {
  isLargeScreen: boolean;
  insetTop: number;
  feedTabs: MastodonFeedTab[];
  selectedFeed: string | undefined;
  onTabChange: (key: string) => void;
};

/**
 * Sticky tabs strip for the Mastodon home tab. Smaller surface than the
 * atproto `FeedListHeader`: no filter affordance (no feed-filter
 * preferences for Mastodon yet) and no `TrendingBar` (that pulls from
 * bsky's trending-topics endpoint; Mastodon's trending lives in its own
 * tab here). Side borders match the atproto path so the column edges
 * line up across protocols on web.
 */
export function MastodonFeedListHeader({
  isLargeScreen,
  insetTop,
  feedTabs,
  selectedFeed,
  onTabChange,
}: MastodonFeedListHeaderProps) {
  const borderColor = useBorderColor();
  const webSideBorders = webColumnSideBorders(borderColor);

  return (
    <ThemedView
      style={[
        {
          paddingTop: isLargeScreen ? insetTop : 0,
        },
        webSideBorders,
      ]}
    >
      <TabBar tabs={feedTabs} activeTab={selectedFeed || ''} onTabChange={onTabChange} />
    </ThemedView>
  );
}
