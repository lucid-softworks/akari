import React from 'react';

import { FeedsTab } from '@/components/profile/FeedsTab';
import { LikesTab } from '@/components/profile/LikesTab';
import { LinksTab } from '@/components/profile/LinksTab';
import { MediaTab } from '@/components/profile/MediaTab';
import { PhotosTab } from '@/components/profile/PhotosTab';
import { PostsTab } from '@/components/profile/PostsTab';
import { RecipesTab } from '@/components/profile/RecipesTab';
import { RepostsTab } from '@/components/profile/RepostsTab';
import { ResumeTab } from '@/components/profile/ResumeTab';
import { RpgItemsTab } from '@/components/profile/RpgItemsTab';
import { RepliesTab } from '@/components/profile/RepliesTab';
import { ReposTab } from '@/components/profile/ReposTab';
import { StarterpacksTab } from '@/components/profile/StarterpacksTab';
import { VideosTab } from '@/components/profile/VideosTab';
import type { ProfileTabType } from '@/types/profile';

export type ProfileTabSharedProps = {
  handle: string;
  ListHeaderComponent: React.ReactElement | null;
  StickyTabComponent: React.ReactElement | null;
  pinScrollY: number;
  onProfileRefresh: () => Promise<void>;
  onScrollY: (y: number) => void;
  onHeaderHeightChange: (h: number) => void;
};

type ProfileTabPaneProps = {
  tab: ProfileTabType;
  isActive: boolean;
  sharedProps: ProfileTabSharedProps;
};

/**
 * Dispatches to the right tab component for the profile screen. Each
 * tab knows how to render its own list and headers; this just routes
 * by the tab key.
 */
export function ProfileTabPane({ tab, isActive, sharedProps }: ProfileTabPaneProps) {
  const props = { ...sharedProps, isActive };
  switch (tab) {
    case 'posts':
      return <PostsTab {...props} />;
    case 'replies':
      return <RepliesTab {...props} />;
    case 'reposts':
      return <RepostsTab {...props} />;
    case 'likes':
      return <LikesTab {...props} />;
    case 'media':
      return <MediaTab {...props} />;
    case 'videos':
      return <VideosTab {...props} />;
    case 'feeds':
      return <FeedsTab {...props} />;
    case 'repos':
      return <ReposTab {...props} />;
    case 'starterpacks':
      return <StarterpacksTab {...props} />;
    case 'recipes':
      return <RecipesTab {...props} />;
    case 'photos':
      return <PhotosTab {...props} />;
    case 'rpgItems':
      return <RpgItemsTab {...props} />;
    case 'resume':
      return <ResumeTab {...props} />;
    case 'links':
      return <LinksTab {...props} />;
    default:
      return null;
  }
}
