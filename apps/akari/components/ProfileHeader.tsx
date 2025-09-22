import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { Labels } from '@/components/Labels';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type ProfileHeaderProps = {
  profile: {
    avatar?: string;
    displayName?: string;
    handle: string;
    description?: string;
    banner?: string;
    did?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    viewer?: {
      following?: string;
      blocking?: string;
      blockedBy?: boolean;
      muted?: boolean;
    };
    labels?: {
      val: string;
      src: string;
      cts: string;
      uri: string;
      cid?: string;
      neg?: boolean;
      value?: string;
      text?: string;
      label?: string;
      ver?: number;
      exp?: string;
    }[];
  };
  isOwnProfile?: boolean;
  onDropdownToggle?: (isOpen: boolean) => void;
  dropdownRef?: React.RefObject<View | null>;
};

const formatNumber = (num: number, locale: string): string => {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  });
  return formatter.format(num);
};

export function ProfileHeader({ profile, isOwnProfile = false, onDropdownToggle, dropdownRef }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHandleHistory, setShowHandleHistory] = useState(false);
  const borderColor = useBorderColor();
  const updateProfileMutation = useUpdateProfile();

  const isBlockedBy = profile.viewer?.blockedBy;

  const handleSearchPosts = () => {
    router.push(`/(tabs)/search?query=from:${profile.handle}`);
  };

  const handleDropdownToggle = () => {
    const newState = !showDropdown;
    setShowDropdown(newState);
    onDropdownToggle?.(newState);
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async (profileData: {
    displayName: string;
    description: string;
    avatar?: string;
    banner?: string;
  }) => {
    try {
      await updateProfileMutation.mutateAsync(profileData);
      setShowEditModal(false);
      showAlert({
        title: t('common.success'),
        message: t('profile.profileUpdated'),
        buttons: [{ text: t('common.ok') }],
      });
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('profile.profileUpdateError'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  return (
    <>
      {/* Banner */}
      <ThemedView style={styles.banner}>
        {profile.banner ? (
          <Image source={{ uri: profile.banner }} style={styles.bannerImage} contentFit="cover" />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <ThemedText style={styles.bannerPlaceholderText}>No banner</ThemedText>
          </View>
        )}
      </ThemedView>

      {/* Profile Header */}
      <ThemedView style={[styles.profileHeader, { borderBottomColor: borderColor }]}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <View style={styles.avatar}>
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} contentFit="cover" />
            </View>
          ) : (
            <View style={styles.avatar}>
              <View style={styles.avatarFallbackContainer}>
                <ThemedText style={styles.avatarFallback}>
                  {(profile.displayName || profile.handle || 'U')[0].toUpperCase()}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileInfoSection}>
          {/* Name and Handle */}
          <View style={styles.nameHandleSection}>
            <ThemedText style={styles.displayName}>{profile.displayName || profile.handle}</ThemedText>
            <TouchableOpacity style={styles.handleContainer} onPress={() => setShowHandleHistory(true)} activeOpacity={0.7}>
              <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
              <IconSymbol name="clock" size={14} color="#666" style={styles.handleHistoryIcon} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                  <ThemedText style={styles.editButtonText}>{t('profile.editProfile')}</ThemedText>
                </TouchableOpacity>
                <View style={styles.moreButtonContainer} ref={dropdownRef}>
                  <TouchableOpacity style={styles.moreButton} onPress={handleDropdownToggle}>
                    <IconSymbol name="ellipsis" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPosts}>
                  <IconSymbol name="magnifyingglass" size={20} color="#007AFF" />
                </TouchableOpacity>
                {!isBlockedBy && (
                  <View style={styles.moreButtonContainer} ref={dropdownRef}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleDropdownToggle}>
                      <IconSymbol name="ellipsis" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <ThemedText style={styles.statText}>
            {t('profile.posts', {
              count: formatNumber(profile.postsCount || 0, currentLocale),
            })}{' '}
            •{' '}
            {t('profile.followers', {
              count: formatNumber(profile.followersCount || 0, currentLocale),
            })}{' '}
            •{' '}
            {t('profile.following', {
              count: formatNumber(profile.followsCount || 0, currentLocale),
            })}
          </ThemedText>
        </View>

        {/* Description */}
        {profile.description && (
          <View style={styles.descriptionContainer}>
            <RichText text={profile.description} style={styles.description} />
          </View>
        )}

        {/* Labels */}
        <Labels labels={profile.labels} />

        {isBlockedBy && (
          <ThemedView style={styles.blockedMessage}>
            <ThemedText style={styles.blockedText}>{t('profile.youAreBlockedByUser')}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
        profile={{
          displayName: profile.displayName,
          description: profile.description,
          avatar: profile.avatar,
          banner: profile.banner,
        }}
        isLoading={updateProfileMutation.isPending}
      />

      {/* Handle History Modal */}
      {profile.did && (
        <HandleHistoryModal
          visible={showHandleHistory}
          onClose={() => setShowHandleHistory(false)}
          did={profile.did}
          currentHandle={profile.handle}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    flex: 1,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  bannerPlaceholderText: {
    fontSize: 16,
    opacity: 0.6,
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    position: 'relative',
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarFallbackContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameHandleSection: {
    flex: 1,
    marginRight: 10,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  handle: {
    fontSize: 15,
    opacity: 0.7,
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handleHistoryIcon: {
    marginLeft: 6,
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  editButton: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  moreButtonContainer: {
    position: 'relative',
    zIndex: 999999,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginBottom: 12,
  },
  statText: {
    fontSize: 15,
    lineHeight: 20,
  },
  statNumber: {
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  descriptionContainer: {
    marginBottom: 12,
  },

  blockedMessage: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  blockedText: {
    fontSize: 14,
    color: '#c62828',
    textAlign: 'center',
  },
});
