import * as Clipboard from 'expo-clipboard';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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

export default function ProfileView({ handle }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [visitedTabs, setVisitedTabs] = useState<Set<ProfileTabType>>(() => new Set(['posts']));
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
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

  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();
  const { showToast } = useToast();

  const { data: profile, isLoading, error, refetch: refetchProfile } = useProfile(handle);
  const isOwnProfile = currentUser?.handle === profile?.handle;

  const handleProfileRefresh = useCallback(async () => {
    await refetchProfile();
  }, [refetchProfile]);

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
    return <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={profile.handle} />;
  }, [activeTab, handleTabChange, profile]);

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

  const renderTab = (tab: ProfileTabType) => {
    if (!handle) return null;
    const sharedProps = {
      handle,
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
    if (!handle) return null;
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
  tabPane: {
    ...StyleSheet.absoluteFillObject,
  },
  tabPaneHidden: {
    opacity: 0,
    zIndex: -1,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: 'red',
  },
});
