import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import React, { memo, useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedsTab } from '@/components/profile/FeedsTab';
import { LikesTab } from '@/components/profile/LikesTab';
import { LinksTab } from '@/components/profile/LinksTab';
import { MediaTab } from '@/components/profile/MediaTab';
import { PhotosTab } from '@/components/profile/PhotosTab';
import { PostsTab } from '@/components/profile/PostsTab';
import { RecipesTab } from '@/components/profile/RecipesTab';
import { ResumeTab } from '@/components/profile/ResumeTab';
import { RpgItemsTab } from '@/components/profile/RpgItemsTab';
import { RepliesTab } from '@/components/profile/RepliesTab';
import { ReposTab } from '@/components/profile/ReposTab';
import { StarterpacksTab } from '@/components/profile/StarterpacksTab';
import { VideosTab } from '@/components/profile/VideosTab';
import { searchProfilePosts } from '@/components/profile/profileActions';
import { ProfileHeaderSkeleton } from '@/components/skeletons';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { queryKeys } from '@/hooks/queryKeys';
import { useTranslation } from '@/hooks/useTranslation';
import { webScreenContainer } from '@/constants/webStyles';
import { useConfirm } from '@/hooks/useConfirm';

import type { ProfileTabType } from '@/types/profile';

type OwnProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

type OwnProfileHeaderProps = {
  profile: OwnProfileShape;
  accountHandle: string;
  onDropdownToggle: (isOpen: boolean) => void;
  dropdownRef: React.RefObject<View | null>;
};

const OwnProfileHeader = memo(function OwnProfileHeader({
  profile,
  accountHandle,
  onDropdownToggle,
  dropdownRef,
}: OwnProfileHeaderProps) {
  return (
    <ProfileHeader
      profile={{
        avatar: profile.avatar,
        displayName: profile.displayName || accountHandle,
        handle: accountHandle,
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
      isOwnProfile={true}
      onDropdownToggle={onDropdownToggle}
      dropdownRef={dropdownRef}
    />
  );
});

const TAB_ORDER: ProfileTabType[] = [
  'posts',
  'replies',
  'resume',
  'likes',
  'media',
  'videos',
  'photos',
  'rpgItems',
  'feeds',
  'repos',
  'starterpacks',
  'recipes',
  'links',
];

type SharedTabProps = {
  handle: string;
  ListHeaderComponent: React.ReactElement | null;
  StickyTabComponent: React.ReactElement | null;
  pinScrollY: number;
  onProfileRefresh: () => Promise<void>;
  onScrollY: (y: number) => void;
  onHeaderHeightChange: (h: number) => void;
};

type OwnProfileTabPaneProps = {
  tab: ProfileTabType;
  isActive: boolean;
  sharedProps: SharedTabProps;
};

function OwnProfileTabPane({ tab, isActive, sharedProps }: OwnProfileTabPaneProps) {
  const props = { ...sharedProps, isActive };
  switch (tab) {
    case 'posts': return <PostsTab {...props} />;
    case 'replies': return <RepliesTab {...props} />;
    case 'likes': return <LikesTab {...props} />;
    case 'media': return <MediaTab {...props} />;
    case 'videos': return <VideosTab {...props} />;
    case 'feeds': return <FeedsTab {...props} />;
    case 'repos': return <ReposTab {...props} />;
    case 'starterpacks': return <StarterpacksTab {...props} />;
    case 'recipes': return <RecipesTab {...props} />;
    case 'photos': return <PhotosTab {...props} />;
    case 'rpgItems': return <RpgItemsTab {...props} />;
    case 'resume': return <ResumeTab {...props} />;
    case 'links': return <LinksTab {...props} />;
    default: return null;
  }
}

export default function ProfileScreen() {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [visitedTabs, setVisitedTabs] = useState<Set<ProfileTabType>>(() => new Set(['posts']));
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile(currentAccount?.handle);
  const queryClient = useQueryClient();

  const handleProfileRefresh = useCallback(async () => {
    const refreshed = await refetchProfile();
    const did = refreshed.data?.did ?? profile?.did;
    if (did) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verifiersForDid(did) });
    }
  }, [refetchProfile, queryClient, profile?.did]);

  const handleDropdownToggle = useCallback((isOpen: boolean) => {
    setShowDropdown(isOpen);
  }, []);

  // Track the active tab's scroll position + measured header height so the
  // next tab can preserve the user's vertical position (banner-visible vs
  // sticky-tabs-pinned) instead of jumping to the top or hiding the banner.
  const lastScrollYRef = useRef(0);
  const lastHeaderHeightRef = useRef(0);
  const nextTabPinScrollYRef = useRef(0);

  const handleScrollY = useCallback((y: number) => {
    lastScrollYRef.current = y;
  }, []);

  const handleHeaderHeightChange = useCallback((h: number) => {
    lastHeaderHeightRef.current = h;
  }, []);

  const handleTabChange = useCallback((tab: ProfileTabType) => {
    setActiveTab((current) => {
      if (current !== tab) {
        const headerH = lastHeaderHeightRef.current;
        const target = headerH > 0 ? Math.min(lastScrollYRef.current, headerH) : 0;
        nextTabPinScrollYRef.current = Math.max(0, target);
      }
      return tab;
    });
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const headerComponent = profile ? (
    <OwnProfileHeader
      profile={profile}
      accountHandle={currentAccount?.handle || ''}
      onDropdownToggle={handleDropdownToggle}
      dropdownRef={dropdownRef}
    />
  ) : null;

  const tabsComponent = (
    <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={currentAccount?.handle || ''} />
  );

  // Show skeleton while loading current account or profile data
  if (isCurrentAccountLoading || isProfileLoading) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <ProfileHeaderSkeleton />
      </ThemedView>
    );
  }

  const handleCopyLink = async () => {
    const profileHandle = currentAccount?.handle || profile?.handle;

    if (!profileHandle) {
      confirm({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
      setShowDropdown(false);
      return;
    }

    try {
      const profileUrl = `https://bsky.app/profile/${profileHandle}`;
      await Clipboard.setStringAsync(profileUrl);
      showToast({
        message: t('profile.linkCopied'),
        type: 'success',
      });
    } catch {
      confirm({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
    } finally {
      setShowDropdown(false);
    }
  };

  const handleSearchPosts = () => {
    searchProfilePosts({
      handle: currentAccount?.handle || profile?.handle,
      onComplete: () => setShowDropdown(false),
    });
  };

  const sharedTabProps: SharedTabProps | null = currentAccount?.handle
    ? {
        handle: currentAccount.handle,
        ListHeaderComponent: headerComponent,
        StickyTabComponent: tabsComponent,
        pinScrollY: nextTabPinScrollYRef.current,
        onProfileRefresh: handleProfileRefresh,
        onScrollY: handleScrollY,
        onHeaderHeightChange: handleHeaderHeightChange,
      }
    : null;

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      {sharedTabProps == null ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>{t('common.loading')}</ThemedText>
        </ThemedView>
      ) : (
        TAB_ORDER.map((tab) => {
          if (!visitedTabs.has(tab)) return null;
          const isActive = tab === activeTab;
          return (
            <View
              key={tab}
              style={[styles.tabPane, !isActive && styles.tabPaneHidden]}
              pointerEvents={isActive ? 'auto' : 'none'}
            >
              <OwnProfileTabPane tab={tab} isActive={isActive} sharedProps={sharedTabProps} />
            </View>
          );
        })
      )}

      <ProfileDropdown
        isVisible={showDropdown}
        onDismiss={() => setShowDropdown(false)}
        onCopyLink={handleCopyLink}
        onSearchPosts={handleSearchPosts}
        onAddToLists={() => {
          setShowDropdown(false);
        }}
        onMuteAccount={() => {
          setShowDropdown(false);
        }}
        onBlockPress={() => {
          setShowDropdown(false);
        }}
        onReportAccount={() => {
          setShowDropdown(false);
        }}
        isFollowing={false}
        isBlocking={false}
        isMuted={false}
        isOwnProfile={true}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabPane: {
    ...StyleSheet.absoluteFillObject,
  },
  tabPaneHidden: {
    opacity: 0,
    zIndex: -1,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
