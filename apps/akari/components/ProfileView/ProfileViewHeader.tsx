import React, { memo } from 'react';
import type { View } from 'react-native';

import { ProfileHeader } from '@/components/ProfileHeader';
import type { WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import type { useProfile } from '@/hooks/queries/useProfile';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

type ProfileViewHeaderProps = {
  profile: ProfileShape;
  isOwnProfile: boolean;
  onDropdownToggle: (isOpen: boolean, rect?: WebPortalAnchorRect) => void;
  dropdownRef: React.RefObject<View | null>;
};

/**
 * Thin memoized wrapper that pins the profile-header subset of fields,
 * so re-rendering the parent's many tab states doesn't reset the
 * banner / avatar layer.
 */
export const ProfileViewHeader = memo(function ProfileViewHeader({
  profile,
  isOwnProfile,
  onDropdownToggle,
  dropdownRef,
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
      onDropdownToggle={onDropdownToggle}
      dropdownRef={dropdownRef}
    />
  );
});
