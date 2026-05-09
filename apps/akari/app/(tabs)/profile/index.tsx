import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedsTab } from '@/components/profile/FeedsTab';
import { LikesTab } from '@/components/profile/LikesTab';
import { LinksTab } from '@/components/profile/LinksTab';
import { MediaTab } from '@/components/profile/MediaTab';
import { PostsTab } from '@/components/profile/PostsTab';
import { RecipesTab } from '@/components/profile/RecipesTab';
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
import { showAlert } from '@/utils/alert';

import type { ProfileTabType } from '@/types/profile';

const TAB_ORDER: ProfileTabType[] = [
  'posts',
  'replies',
  'likes',
  'media',
  'videos',
  'feeds',
  'repos',
  'starterpacks',
  'recipes',
  'links',
];

export default function ProfileScreen() {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [visitedTabs, setVisitedTabs] = useState<Set<ProfileTabType>>(() => new Set(['posts']));
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const { t } = useTranslation();
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

  const headerComponent = useMemo(() => {
    if (!profile) return null;
    return (
      <ProfileHeader
        profile={{
          avatar: profile.avatar,
          displayName: profile.displayName || currentAccount?.handle || '',
          handle: currentAccount?.handle || '',
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
        onDropdownToggle={handleDropdownToggle}
        dropdownRef={dropdownRef}
      />
    );
  }, [profile, currentAccount, handleDropdownToggle, dropdownRef]);

  const tabsComponent = useMemo(() => (
    <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={currentAccount?.handle || ''} />
  ), [activeTab, handleTabChange, currentAccount?.handle]);

  // Show skeleton while loading current account or profile data
  if (isCurrentAccountLoading || isProfileLoading) {
    return (
      <ThemedView style={styles.container}>
        <ProfileHeaderSkeleton />
      </ThemedView>
    );
  }

  const handleCopyLink = async () => {
    const profileHandle = currentAccount?.handle || profile?.handle;

    if (!profileHandle) {
      showAlert({
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
      showAlert({
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

  const renderTab = (tab: ProfileTabType) => {
    if (!currentAccount?.handle) return null;
    const sharedProps = {
      handle: currentAccount.handle,
      ListHeaderComponent: headerComponent,
      StickyTabComponent: tabsComponent,
      pinScrollY: nextTabPinScrollYRef.current,
      isActive: tab === activeTab,
      onProfileRefresh: handleProfileRefresh,
      onScrollY: handleScrollY,
      onHeaderHeightChange: handleHeaderHeightChange,
    };
    switch (tab) {
      case 'posts': return <PostsTab {...sharedProps} />;
      case 'replies': return <RepliesTab {...sharedProps} />;
      case 'likes': return <LikesTab {...sharedProps} />;
      case 'media': return <MediaTab {...sharedProps} />;
      case 'videos': return <VideosTab {...sharedProps} />;
      case 'feeds': return <FeedsTab {...sharedProps} />;
      case 'repos': return <ReposTab {...sharedProps} />;
      case 'starterpacks': return <StarterpacksTab {...sharedProps} />;
      case 'recipes': return <RecipesTab {...sharedProps} />;
      case 'links': return <LinksTab {...sharedProps} />;
      default: return null;
    }
  };

  const renderTabContent = () => {
    if (!currentAccount?.handle) {
      return (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>{t('common.loading')}</ThemedText>
        </ThemedView>
      );
    }

    return TAB_ORDER.map((tab) => {
      if (!visitedTabs.has(tab)) return null;
      const isActive = tab === activeTab;
      return (
        <View
          key={tab}
          style={[styles.tabPane, !isActive && styles.tabPaneHidden]}
          pointerEvents={isActive ? 'auto' : 'none'}
        >
          {renderTab(tab)}
        </View>
      );
    });
  };

  return (
    <ThemedView style={styles.container}>
      {renderTabContent()}

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
