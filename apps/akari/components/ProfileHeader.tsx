import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { Labels } from '@/components/Labels';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { useAppTheme, type AppThemeColors } from '@/theme';

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
  const followMutation = useFollowUser();
  const blockMutation = useBlockUser();
  const updateProfileMutation = useUpdateProfile();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isFollowing = !!profile.viewer?.following;
  const isBlocking = !!profile.viewer?.blocking;
  const isBlockedBy = profile.viewer?.blockedBy;

  const handleFollow = async () => {
    if (!profile.did) return;

    try {
      if (isFollowing) {
        await followMutation.mutateAsync({
          did: profile.did,
          followUri: profile.viewer?.following,
          action: 'unfollow',
        });
      } else {
        await followMutation.mutateAsync({
          did: profile.did,
          action: 'follow',
        });
      }
      setShowDropdown(false);
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleBlock = async () => {
    if (!profile.did) return;

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
      setShowDropdown(false);
    } catch {
      // Handle block error
    }
  };

  const handleSearchPosts = () => {
    router.push(`/(tabs)/search?query=from:${profile.handle}`);
  };

  const handleCopyLink = async () => {
    try {
      const profileUrl = `https://bsky.app/profile/${profile.handle}`;
      await Clipboard.setStringAsync(profileUrl);
      showAlert({
        title: t('common.success'),
        message: t('profile.linkCopied'),
        buttons: [{ text: t('common.ok') }],
      });
      setShowDropdown(false);
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  const handleAddToLists = () => {
    // TODO: Implement add to lists functionality
    // This would typically open a modal or navigate to a lists management screen
    showAlert({
      title: t('profile.addToLists'),
      message: 'Lists functionality coming soon!',
      buttons: [{ text: t('common.ok') }],
    });
    setShowDropdown(false);
  };

  const handleMuteAccount = () => {
    // TODO: Implement mute functionality
    const isMuted = profile.viewer?.muted;
    const message = isMuted
      ? t('profile.unmuteConfirmation', { handle: profile.handle })
      : t('profile.muteConfirmation', { handle: profile.handle });

    showAlert({
      title: isMuted ? t('common.unmute') : t('common.mute'),
      message,
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isMuted ? t('common.unmute') : t('common.mute'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual mute/unmute API call
            console.log(isMuted ? 'Unmuting' : 'Muting', profile.handle);
          },
        },
      ],
    });
    setShowDropdown(false);
  };

  const handleReportAccount = () => {
    showAlert({
      title: t('profile.reportAccount'),
      message: t('profile.reportConfirmation', { handle: profile.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.reportAccount'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual report API call
            console.log('Reporting', profile.handle);
          },
        },
      ],
    });
    setShowDropdown(false);
  };

  const handleDropdownToggle = () => {
    const newState = !showDropdown;
    setShowDropdown(newState);
    onDropdownToggle?.(newState);
  };

  const handleFollowPress = () => {
    if (isFollowing) {
      showAlert({
        title: t('common.unfollow'),
        message: t('profile.unfollowConfirmation', { handle: profile.handle }),
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.unfollow'),
            style: 'destructive',
            onPress: handleFollow,
          },
        ],
      });
    } else {
      handleFollow();
    }
  };

  const handleBlockPress = () => {
    if (isBlocking) {
      showAlert({
        title: t('common.unblock'),
        message: t('profile.unblockConfirmation', { handle: profile.handle }),
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.unblock'),
            style: 'destructive',
            onPress: handleBlock,
          },
        ],
      });
    } else {
      showAlert({
        title: t('common.block'),
        message: t('profile.blockConfirmation', { handle: profile.handle }),
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.block'),
            style: 'destructive',
            onPress: handleBlock,
          },
        ],
      });
    }
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
    } catch (error) {
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
            <TouchableOpacity
              style={styles.handleContainer}
              onPress={() => setShowHandleHistory(true)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
              <IconSymbol name="clock" size={14} color={colors.textMuted} style={styles.handleHistoryIcon} />
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
                    <IconSymbol name="ellipsis" size={20} color={colors.inverseText} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPosts}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.accent} />
                </TouchableOpacity>
                {!isBlockedBy && (
                  <View style={styles.moreButtonContainer} ref={dropdownRef}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleDropdownToggle}>
                      <IconSymbol name="ellipsis" size={20} color={colors.accent} />
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

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    banner: {
      height: 150,
      backgroundColor: colors.surfaceSecondary,
    },
    bannerImage: {
      flex: 1,
    },
    bannerPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceTertiary,
    },
    bannerPlaceholderText: {
      fontSize: 16,
      opacity: 0.6,
      color: colors.textSecondary,
    },
    profileHeader: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      position: 'relative',
      backgroundColor: colors.surface,
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
      borderColor: colors.background,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSecondary,
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallback: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.inverseText,
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
      color: colors.textSecondary,
    },
    handleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    handleHistoryIcon: {
      marginLeft: 6,
      opacity: 0.6,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.borderMuted,
    },
    editButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accent,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      color: colors.inverseText,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMuted,
      backgroundColor: colors.surfaceActive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsContainer: {
      marginBottom: 12,
    },
    statText: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    statNumber: {
      fontWeight: 'bold',
      color: colors.text,
    },
    description: {
      fontSize: 14,
      lineHeight: 18,
      color: colors.text,
    },
    descriptionContainer: {
      marginBottom: 12,
    },
    blockedMessage: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: `${colors.danger}1A`,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.danger,
    },
    blockedText: {
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
    },
  });
}
