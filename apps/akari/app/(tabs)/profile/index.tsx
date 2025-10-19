import * as Clipboard from 'expo-clipboard';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ProfileTabType } from '@/types/profile';

export default function ProfileScreen() {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } = useCurrentAccount();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Create scroll to top function
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('profile', scrollToTop);
  }, []);

  const { data: profile, isLoading: isProfileLoading } = useProfile(currentAccount?.handle);

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Show skeleton while loading current account or profile data
  if (isCurrentAccountLoading || isProfileLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileHeaderSkeleton />
      </ThemedView>
    );
  }

  const handleDropdownToggle = (isOpen: boolean) => {
    if (isOpen && dropdownRef.current) {
      // Measure the position of the more button
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setDropdownPosition({
          top: pageY + height + 4, // Position below the button with 4px gap
          right: 20, // 20px from right edge
        });
      });
    }
    setShowDropdown(isOpen);
  };

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

  const handleTabChange = (tab: ProfileTabType) => {
    setActiveTab(tab);
    // Scroll to top when switching tabs
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
        return <PostsTab handle={currentAccount.handle} />;
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
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={{
            avatar: profile?.avatar,
            displayName: profile?.displayName || currentAccount?.handle || '',
            handle: currentAccount?.handle || '',
            description: profile?.description,
            banner: profile?.banner,
            did: profile?.did,
            followersCount: profile?.followersCount,
            followsCount: profile?.followsCount,
            postsCount: profile?.postsCount,
            viewer: profile?.viewer,
            labels: profile?.labels,
          }}
          isOwnProfile={true}
          onDropdownToggle={handleDropdownToggle}
          dropdownRef={dropdownRef}
        />
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={currentAccount?.handle || ''} />

        {renderTabContent()}
      </ScrollView>

      {/* Dropdown rendered at root level */}
      <ProfileDropdown
        isVisible={showDropdown}
        onCopyLink={handleCopyLink}
        onSearchPosts={handleSearchPosts}
        onAddToLists={() => {
          // TODO: Implement add to lists functionality
          setShowDropdown(false);
        }}
        onMuteAccount={() => {
          // TODO: Implement mute account functionality
          setShowDropdown(false);
        }}
        onBlockPress={() => {
          // TODO: Implement block account functionality
          setShowDropdown(false);
        }}
        onReportAccount={() => {
          // TODO: Implement report account functionality
          setShowDropdown(false);
        }}
        isFollowing={false}
        isBlocking={false}
        isMuted={false}
        isOwnProfile={true}
        style={{
          top: dropdownPosition.top,
          right: dropdownPosition.right,
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Account for tab bar
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
