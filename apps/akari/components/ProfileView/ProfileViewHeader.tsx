import React, { memo } from 'react';

import { ProfileHeader } from '@/components/ProfileHeader';
import type { MenuItem } from '@/components/ui/Menu';
import type { useProfile } from '@/hooks/queries/useProfile';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

type ProfileViewHeaderProps = {
  profile: ProfileShape;
  isOwnProfile: boolean;
  menuItems: readonly MenuItem[];
};

/**
 * Thin memoized wrapper that pins the profile-header subset of fields,
 * so re-rendering the parent's many tab states doesn't reset the
 * banner / avatar layer.
 */
export const ProfileViewHeader = memo(function ProfileViewHeader({
  profile,
  isOwnProfile,
  menuItems,
}: ProfileViewHeaderProps) {
  return (
    <ProfileHeader
      profile={{
        avatar: profile.avatar,
        displayName: profile.displayName,
        handle: profile.handle,
        description: profile.description,
        pronouns: profile.pronouns,
        website: profile.website,
        banner: profile.banner,
        createdAt: profile.createdAt,
        did: profile.did,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        postsCount: profile.postsCount,
        viewer: profile.viewer,
        labels: profile.labels,
        verification: profile.verification,
      }}
      isOwnProfile={isOwnProfile}
      menuItems={menuItems}
    />
  );
});
