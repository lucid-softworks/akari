import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedsTab } from '@/components/profile/FeedsTab';
import { LikesTab } from '@/components/profile/LikesTab';
import { MediaTab } from '@/components/profile/MediaTab';
import { PostsTab } from '@/components/profile/PostsTab';
import { RepliesTab } from '@/components/profile/RepliesTab';
import { StarterpacksTab } from '@/components/profile/StarterpacksTab';
import { ReposTab } from '@/components/profile/ReposTab';
import { VideosTab } from '@/components/profile/VideosTab';
import { searchProfilePosts } from '@/components/profile/profileActions';
import { ProfileHeaderSkeleton } from '@/components/skeletons';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabType } from '@/types/profile';
import { showAlert } from '@/utils/alert';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<View | null>(null);
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();
  const { showToast } = useToast();

  const { data: profile, isLoading, error } = useProfile(handle);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ProfileHeaderSkeleton />
      </ThemedView>
    );
  }

  if (error || !profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{t('common.noProfile')}</ThemedText>
      </ThemedView>
    );
  }

  const isOwnProfile = currentUser?.handle === profile?.handle;

  const handleDropdownToggle = (isOpen: boolean) => {
    if (isOpen && dropdownRef.current) {
      // Measure the position of the more button
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setDropdownPosition({
          top: pageY + height - 62, // Position with final fine-tuned adjustment
          right: 20, // 20px from right edge
        });
      });
    }
    setShowDropdown(isOpen);
  };

  const handleCopyLink = async () => {
    const profileHandle = profile?.handle;

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
      handle: profile?.handle,
      onComplete: () => setShowDropdown(false),
    });
  };

  const handleAddToLists = () => {
    // TODO: Implement add to lists functionality
    console.log('Add to lists');
    setShowDropdown(false);
  };

  const handleMuteAccount = () => {
    // TODO: Implement mute functionality
    console.log('Mute account');
    setShowDropdown(false);
  };

  const handleBlockPress = () => {
    // TODO: Implement block functionality
    console.log('Block account');
    setShowDropdown(false);
  };

  const handleReportAccount = () => {
    // TODO: Implement report functionality
    console.log('Report account');
    setShowDropdown(false);
  };

  const renderTabContent = () => {
    if (!handle) return null;

    switch (activeTab) {
      case 'posts':
        return <PostsTab handle={handle} />;
      case 'replies':
        return <RepliesTab handle={handle} />;
      case 'likes':
        return <LikesTab handle={handle} />;
      case 'media':
        return <MediaTab handle={handle} />;
      case 'videos':
        return <VideosTab handle={handle} />;
      case 'feeds':
        return <FeedsTab handle={handle} />;
      case 'repos':
        return <ReposTab handle={handle} />;
      case 'starterpacks':
        return <StarterpacksTab handle={handle} />;
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
          <ProfileHeader
            profile={{
              avatar: profile?.avatar,
              displayName: profile?.displayName,
              handle: profile?.handle,
              description: profile?.description,
              banner: profile?.banner,
              did: profile?.did,
              followersCount: profile?.followersCount,
              followsCount: profile?.followsCount,
              postsCount: profile?.postsCount,
              viewer: profile?.viewer,
              labels: profile?.labels,
            }}
            isOwnProfile={isOwnProfile}
            onDropdownToggle={handleDropdownToggle}
            dropdownRef={dropdownRef}
          />

          {/* Tabs */}
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} profileHandle={profile.handle} />

          {/* Content */}
          {renderTabContent()}
      </ScrollView>

      {/* Dropdown rendered at root level */}
      <ProfileDropdown
        isVisible={showDropdown}
        onCopyLink={handleCopyLink}
        onSearchPosts={handleSearchPosts}
        onAddToLists={handleAddToLists}
        onMuteAccount={handleMuteAccount}
        onBlockPress={handleBlockPress}
        onReportAccount={handleReportAccount}
        isFollowing={!!profile?.viewer?.following}
        isBlocking={!!profile?.viewer?.blocking}
        isMuted={!!profile?.viewer?.muted}
        isOwnProfile={isOwnProfile}
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: 'red',
  },
});
