import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
import { VideosTab } from '@/components/profile/VideosTab';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ProfileTabType } from '@/types/profile';

export default function ProfileScreen() {
  const { data: currentAccount } = useCurrentAccount();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  // Create scroll to top function
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('profile', scrollToTop);
  }, []);

  const { data: profile } = useProfile(currentAccount?.handle);

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
      case 'starterpacks':
        return <StarterpacksTab handle={currentAccount.handle} />;
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
        />
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={currentAccount?.handle || ''} />

        {renderTabContent()}
      </ScrollView>

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
