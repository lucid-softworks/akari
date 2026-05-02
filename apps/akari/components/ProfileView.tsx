import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { spacing, fontSize } from '@/constants/tokens';
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
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabType } from '@/types/profile';
import { showAlert } from '@/utils/alert';

type ProfileViewProps = {
  handle: string;
};

const VISIBLE_COUNT_PAGE = 10;
const NEAR_END_THRESHOLD_PX = 300;

export default function ProfileView({ handle }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_COUNT_PAGE);
  const wasNearEnd = useRef(false);

  useEffect(() => {
    setVisibleCount(VISIBLE_COUNT_PAGE);
    wasNearEnd.current = false;
  }, [activeTab]);

  const handleNearEndScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const nearEnd =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - NEAR_END_THRESHOLD_PX;
      if (nearEnd && !wasNearEnd.current) {
        setVisibleCount((c) => c + VISIBLE_COUNT_PAGE);
      }
      wasNearEnd.current = nearEnd;
    },
    [],
  );
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();
  const { showToast } = useToast();

  const { data: profile, isLoading, error } = useProfile(handle);
  const isOwnProfile = currentUser?.handle === profile?.handle;

  const headerComponent = useMemo(() => {
    if (!profile) return null;
    return (
      <ProfileHeader
        profile={{
          avatar: profile.avatar,
          displayName: profile.displayName,
          handle: profile.handle,
          description: profile.description,
          banner: profile.banner,
          did: profile.did,
          followersCount: profile.followersCount,
          followsCount: profile.followsCount,
          postsCount: profile.postsCount,
          viewer: profile.viewer,
          labels: profile.labels,
        }}
        isOwnProfile={isOwnProfile}
        onDropdownToggle={(isOpen: boolean) => setShowDropdown(isOpen)}
        dropdownRef={dropdownRef}
      />
    );
  }, [profile, isOwnProfile, dropdownRef]);

  const tabsComponent = useMemo(() => {
    if (!profile) return null;
    return <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} profileHandle={profile.handle} />;
  }, [activeTab, setActiveTab, profile]);

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

  const handleDropdownToggle = (isOpen: boolean) => {
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
    setShowDropdown(false);
  };

  const handleMuteAccount = () => {
    // TODO: Implement mute functionality
    setShowDropdown(false);
  };

  const handleBlockPress = () => {
    // TODO: Implement block functionality
    setShowDropdown(false);
  };

  const handleReportAccount = () => {
    // TODO: Implement report functionality
    setShowDropdown(false);
  };

  const renderTabContent = () => {
    if (!handle) return null;

    if (activeTab === 'posts') {
      return <PostsTab handle={handle} ListHeaderComponent={headerComponent} StickyTabComponent={tabsComponent} />;
    }

    let tabBody: React.ReactNode = null;
    switch (activeTab) {
      case 'replies':
        tabBody = <RepliesTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'likes':
        tabBody = <LikesTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'media':
        tabBody = <MediaTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'videos':
        tabBody = <VideosTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'feeds':
        tabBody = <FeedsTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'repos':
        tabBody = <ReposTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'starterpacks':
        tabBody = <StarterpacksTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'recipes':
        tabBody = <RecipesTab handle={handle} visibleCount={visibleCount} />;
        break;
      case 'links':
        tabBody = <LinksTab handle={handle} visibleCount={visibleCount} />;
        break;
      default:
        return null;
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        stickyHeaderHiddenOnScroll
        showsVerticalScrollIndicator={false}
        onScroll={handleNearEndScroll}
        scrollEventThrottle={200}
      >
        {headerComponent}
        {tabsComponent}
        {tabBody}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {renderTabContent()}

      <ProfileDropdown
        isVisible={showDropdown}
        onDismiss={() => setShowDropdown(false)}
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
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: 'red',
  },
});
