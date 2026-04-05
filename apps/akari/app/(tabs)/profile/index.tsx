import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing } from '@/constants/tokens';
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
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

import type { ProfileTabType } from '@/types/profile';

export default function ProfileScreen() {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [showDropdown, setShowDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile(currentAccount?.handle);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProfile();
    setRefreshing(false);
  }, [refetchProfile]);

  const handleDropdownToggle = useCallback((isOpen: boolean) => {
    setShowDropdown(isOpen);
  }, []);

  const handleTabChange = useCallback((tab: ProfileTabType) => {
    setActiveTab(tab);
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
          banner: profile.banner,
          did: profile.did,
          followersCount: profile.followersCount,
          followsCount: profile.followsCount,
          postsCount: profile.postsCount,
          viewer: profile.viewer,
          labels: profile.labels,
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

  const renderTabContent = () => {
    if (!currentAccount?.handle) {
      return (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>{t('common.loading')}</ThemedText>
        </ThemedView>
      );
    }

    switch (activeTab) {
      case 'posts':
        return <PostsTab handle={currentAccount.handle} ListHeaderComponent={headerComponent} StickyTabComponent={tabsComponent} onRefresh={handleRefresh} refreshing={refreshing} />;
      case 'replies':
        return <RepliesTab handle={currentAccount.handle} />;
      case 'likes':
        return <LikesTab handle={currentAccount.handle} />;
      case 'media':
        return <MediaTab handle={currentAccount.handle} />;
      case 'videos':
        return <VideosTab handle={currentAccount.handle} />;
      case 'feeds':
        return <FeedsTab handle={currentAccount.handle} />;
      case 'repos':
        return <ReposTab handle={currentAccount.handle} />;
      case 'starterpacks':
        return <StarterpacksTab handle={currentAccount.handle} />;
      case 'recipes':
        return <RecipesTab handle={currentAccount.handle} />;
      case 'links':
        return <LinksTab handle={currentAccount.handle} />;
      default:
        return (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>{t('profile.noContent')}</ThemedText>
          </ThemedView>
        );
    }
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
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
