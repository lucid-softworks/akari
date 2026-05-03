import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { KeytraceClaims } from '@/components/KeytraceClaims';
import { ReportSheet } from '@/components/ReportSheet';
import { Labels } from '@/components/Labels';
import { searchProfilePosts } from '@/components/profile/profileActions';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout, hitSlop } from '@/constants/tokens';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
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
  onSettingsPress?: () => void;
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

export function ProfileHeader({ profile, isOwnProfile = false, onSettingsPress, onDropdownToggle, dropdownRef }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHandleHistory, setShowHandleHistory] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const borderColor = useBorderColor();
  const avatarBorderColor = useThemeColor({}, 'background');
  const bannerPlaceholderColor = useThemeColor({ light: '#e0e0e0', dark: '#2A2D2E' }, 'background');
  const mutedTextColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );
  const followMutation = useFollowUser();
  const blockMutation = useBlockUser();
  const muteMutation = useMuteUser();
  const updateProfileMutation = useUpdateProfile();
  const { showToast } = useToast();

  const isFollowing = !!profile.viewer?.following;
  const isBlocking = !!profile.viewer?.blocking;
  const isBlockedBy = profile.viewer?.blockedBy;

  const handleFollow = async () => {
    if (!profile.did) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      showToast({
        type: 'error',
        title: isFollowing ? t('common.unfollow') : t('common.follow'),
        message: t('common.somethingWentWrong'),
      });
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
    } catch (error) {
      console.error('Block error:', error);
      showToast({
        type: 'error',
        title: isBlocking ? t('common.unblock') : t('common.block'),
        message: t('common.somethingWentWrong'),
      });
    }
  };

  const handleSearchPosts = () => {
    searchProfilePosts({ handle: profile.handle });
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
    if (!profile.did) return;
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
            muteMutation.mutate({
              actor: profile.did!,
              action: isMuted ? 'unmute' : 'mute',
            });
          },
        },
      ],
    });
    setShowDropdown(false);
  };

  const handleReportAccount = () => {
    setShowDropdown(false);
    setShowReportSheet(true);
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
          <View style={[styles.bannerPlaceholder, { backgroundColor: bannerPlaceholderColor }]}>
            <ThemedText style={styles.bannerPlaceholderText}>{t('ui.noBanner')}</ThemedText>
          </View>
        )}
      </ThemedView>

      {/* Profile Header */}
      <ThemedView style={[styles.profileHeader, { borderBottomColor: borderColor }]}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <View style={[styles.avatar, { borderColor: avatarBorderColor }]}>
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} contentFit="cover" />
            </View>
          ) : (
            <View style={[styles.avatar, { borderColor: avatarBorderColor }]}>
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
            <TouchableOpacity style={styles.handleContainer} onPress={() => setShowHandleHistory(true)} activeOpacity={activeOpacity.default} hitSlop={hitSlop}>
              <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
              <IconSymbol name="clock" size={fontSize.base} color="#666" style={styles.handleHistoryIcon} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                  <ThemedText style={styles.editButtonText}>{t('profile.editProfile')}</ThemedText>
                </TouchableOpacity>
                {onSettingsPress ? (
                  <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress} activeOpacity={activeOpacity.default} hitSlop={hitSlop}>
                    <IconSymbol name="gearshape" size={fontSize.xxl} color={semanticColors.systemBlue} />
                  </TouchableOpacity>
                ) : null}
                <View style={styles.moreButtonContainer} ref={dropdownRef}>
                  <TouchableOpacity style={styles.moreButton} onPress={handleDropdownToggle} activeOpacity={activeOpacity.default} hitSlop={hitSlop}>
                    <IconSymbol name="ellipsis" size={fontSize.xxl} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {!isBlockedBy && !profile.viewer?.blocking ? (
                  <TouchableOpacity
                    style={isFollowing ? styles.followingButton : styles.followButton}
                    onPress={handleFollowPress}
                    disabled={followMutation.isPending}
                    activeOpacity={activeOpacity.default}
                  >
                    <ThemedText
                      style={isFollowing ? styles.followingButtonText : styles.followButtonText}
                    >
                      {isFollowing ? t('common.following') : t('common.follow')}
                    </ThemedText>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPosts} activeOpacity={activeOpacity.default} hitSlop={hitSlop}>
                  <IconSymbol name="magnifyingglass" size={fontSize.xxl} color={semanticColors.systemBlue} />
                </TouchableOpacity>
                <View style={styles.moreButtonContainer} ref={dropdownRef}>
                  <TouchableOpacity style={styles.iconButton} onPress={handleDropdownToggle} activeOpacity={activeOpacity.default} hitSlop={hitSlop}>
                    <IconSymbol name="ellipsis" size={fontSize.xxl} color={semanticColors.systemBlue} />
                  </TouchableOpacity>
                </View>
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

        {/* Verified Identities */}
        <KeytraceClaims handle={profile.handle} />

        {/* Labels */}
        <Labels labels={profile.labels} />

        {(isBlockedBy || isBlocking) ? (
          <View style={[styles.blockedMessage, { borderColor }]}>
            <IconSymbol name="hand.raised.fill" size={16} color={mutedTextColor} />
            <ThemedText style={[styles.blockedText, { color: mutedTextColor }]}>
              {isBlockedBy && isBlocking
                ? t('profile.mutualBlock')
                : isBlockedBy
                ? t('profile.youAreBlockedByUser')
                : t('profile.youHaveBlockedUser')}
            </ThemedText>
          </View>
        ) : null}
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

      {/* Report Sheet */}
      {profile.did && (
        <ReportSheet
          visible={showReportSheet}
          onDismiss={() => setShowReportSheet(false)}
          subject={{ type: 'account', did: profile.did }}
        />
      )}
    </>
  );
}

const AVATAR_INNER = layout.avatarLarge - 6; // 74px (80 - 2*3 border)

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
    // backgroundColor applied dynamically via useThemeColor
  },
  bannerPlaceholderText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary + 0.1,
  },
  profileHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    position: 'relative',
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: layout.avatarLarge,
    height: layout.avatarLarge,
    borderRadius: layout.avatarLarge / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    // borderColor applied dynamically via useThemeColor
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
  },
  avatarFallbackContainer: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  profileInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  nameHandleSection: {
    flex: 1,
    marginRight: spacing.sm + spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xxs,
  },
  handle: {
    fontSize: 15,
    opacity: opacity.secondary,
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handleHistoryIcon: {
    marginLeft: spacing.sm - spacing.xxs,
    opacity: opacity.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
    borderWidth: layout.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  editButton: {
    height: layout.avatarSmall,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: semanticColors.systemBlue,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  followButton: {
    height: layout.avatarSmall,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: semanticColors.systemBlue,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  followingButton: {
    height: layout.avatarSmall,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: semanticColors.systemBlue,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButtonText: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  moreButtonContainer: {
    position: 'relative',
    zIndex: 999999,
  },
  moreButton: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginBottom: spacing.sm,
  },
  statText: {
    fontSize: 15,
    lineHeight: 20,
  },
  statNumber: {
    fontWeight: fontWeight.bold,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  descriptionContainer: {
    marginBottom: spacing.sm,
  },

  blockedMessage: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  blockedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
