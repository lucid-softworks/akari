import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { ProfileHeaderSkeleton } from '@/components/skeletons';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabType } from '@/types/profile';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();

  const { data: profile, isLoading, error } = useProfile(handle);

  if (isLoading) {
    return <ProfileHeaderSkeleton />;
  }

  if (error || !profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{t('common.noProfile')}</ThemedText>
      </ThemedView>
    );
  }

  const isOwnProfile = currentUser?.handle === profile?.handle;

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
        />

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} profileHandle={profile.handle} />

        {/* Content */}
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: 'red',
  },
});
