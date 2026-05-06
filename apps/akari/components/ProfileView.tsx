import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing, fontSize } from '@/constants/tokens';
import { ListPickerSheet } from '@/components/ListPickerSheet';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ReportSheet } from '@/components/ReportSheet';
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
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
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
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
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
  const blockMutation = useBlockUser();
  const muteMutation = useMuteUser();

  const { data: profile, isLoading, error, refetch: refetchProfile } = useProfile(handle);
  const isOwnProfile = currentUser?.handle === profile?.handle;
  const queryClient = useQueryClient();

  const handleProfileRefresh = useCallback(async () => {
    const refreshed = await refetchProfile();
    const did = refreshed.data?.did ?? profile?.did;
    if (did) {
      await queryClient.invalidateQueries({ queryKey: ['verifiersForDid', did] });
    }
  }, [refetchProfile, queryClient, profile?.did]);

  const runBlock = useCallback(async () => {
    if (!profile?.did) return;
    const isBlocking = !!profile.viewer?.blocking;
    try {
      if (isBlocking) {
        await blockMutation.mutateAsync({
          did: profile.did,
          blockUri: profile.viewer?.blocking,
          action: 'unblock',
        });
      } else {
        await blockMutation.mutateAsync({
          did: profile.did,
          action: 'block',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: isBlocking ? t('common.unblock') : t('common.block'),
        message: t('common.somethingWentWrong'),
      });
      if (__DEV__) console.warn('Block error:', err);
    }
  }, [profile, blockMutation, showToast, t]);

  const headerComponent = useMemo(() => {
    if (!profile) return null;
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
    setShowDropdown(false);
    setShowListPicker(true);
  };

  const handleBlockPress = () => {
    setShowDropdown(false);
    if (!profile) return;
    const isBlocking = !!profile.viewer?.blocking;
    showAlert({
      title: isBlocking ? t('common.unblock') : t('common.block'),
      message: isBlocking
        ? t('profile.unblockConfirmation', { handle: profile.handle })
        : t('profile.blockConfirmation', { handle: profile.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isBlocking ? t('common.unblock') : t('common.block'),
          style: 'destructive',
          onPress: () => {
            runBlock();
          },
        },
      ],
    });
  };

  const handleMuteAccount = () => {
    setShowDropdown(false);
    if (!profile?.did) return;
    const isMuted = !!profile.viewer?.muted;
    showAlert({
      title: isMuted ? t('common.unmute') : t('common.mute'),
      message: isMuted
        ? t('profile.unmuteConfirmation', { handle: profile.handle })
        : t('profile.muteConfirmation', { handle: profile.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isMuted ? t('common.unmute') : t('common.mute'),
          style: 'destructive',
          onPress: () => {
            muteMutation.mutate({
              actor: profile.did!,
              action: isMuted ? 'unmute' : 'mute',
            });
          },
        },
      ],
    });
  };

  const handleReportAccount = () => {
    setShowDropdown(false);
    setShowReportSheet(true);
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

  // When the relationship is blocked in either direction, the post-feed
  // queries would either 4xx or return empty pages — skip them entirely
  // and just show the profile header (which already explains the
  // relationship via its own blocked banner).
  const isBlockedRelationship =
    !!profile?.viewer?.blockedBy || !!profile?.viewer?.blocking;

  if (isBlockedRelationship) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.blockedScroll}>
          {headerComponent}
        </ScrollView>

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

        <ReportSheet
          visible={showReportSheet}
          onDismiss={() => setShowReportSheet(false)}
          subject={profile?.did ? { type: 'account', did: profile.did } : null}
        />
      </ThemedView>
    );
  }

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

      <ReportSheet
        visible={showReportSheet}
        onDismiss={() => setShowReportSheet(false)}
        subject={profile?.did ? { type: 'account', did: profile.did } : null}
      />

      <ListPickerSheet
        visible={showListPicker}
        onDismiss={() => setShowListPicker(false)}
        subjectDid={profile?.did}
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
  blockedScroll: {
    paddingBottom: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: 'red',
  },
});
