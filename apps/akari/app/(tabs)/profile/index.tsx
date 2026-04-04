import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, activeOpacity } from '@/constants/tokens';
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
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

import type { ProfileTabType } from '@/types/profile';

export default function ProfileScreen() {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [visibleCount, setVisibleCount] = useState(5);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<View | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const iconColor = useThemeColor({}, 'icon');

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
      <ThemedView style={styles.container}>
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
    setVisibleCount(5); // Reset batch size on tab switch
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const scrollProgress = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
    if (scrollProgress > 0.7) {
      setVisibleCount((prev) => prev + 10);
    }
  }, []);

  const renderTabContent = () => {
    if (!currentAccount?.handle) {
      return (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>{t('common.loading')}</ThemedText>
        </ThemedView>
      );
    }

    const vc = visibleCount;
    switch (activeTab) {
      case 'posts':
        return <PostsTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'replies':
        return <RepliesTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'likes':
        return <LikesTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'media':
        return <MediaTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'videos':
        return <VideosTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'feeds':
        return <FeedsTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'repos':
        return <ReposTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'starterpacks':
        return <StarterpacksTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'recipes':
        return <RecipesTab handle={currentAccount.handle} visibleCount={vc} />;
      case 'links':
        return <LinksTab handle={currentAccount.handle} visibleCount={vc} />;
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
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* Settings gear */}
        <View style={styles.settingsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={activeOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.settingsButton}
          >
            <IconSymbol name="gearshape" size={22} color={iconColor} />
          </TouchableOpacity>
        </View>

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

      <ProfileDropdown
        isVisible={showDropdown}
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
    paddingBottom: 100,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  settingsButton: {
    padding: spacing.sm,
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
