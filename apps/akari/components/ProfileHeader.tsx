import * as Haptics from 'expo-haptics';
import { Image } from '@/components/Image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { KeytraceClaims } from '@/components/KeytraceClaims';
import { ReportSheet } from '@/components/ReportSheet';
import { Labels } from '@/components/Labels';
import { VerificationBadge } from '@/components/VerificationBadge';
import { searchProfilePosts } from '@/components/profile/profileActions';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout, hitSlop } from '@/constants/tokens';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useStartConvo } from '@/hooks/mutations/useStartConvo';
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
    pronouns?: string;
    website?: string;
    banner?: string;
    createdAt?: string;
    did?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
    viewer?: {
      following?: string;
      followedBy?: string;
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
    verification?: BlueskyVerification;
  };
  isOwnProfile?: boolean;
  onSettingsPress?: () => void;
  onDropdownToggle?: (isOpen: boolean) => void;
  dropdownRef?: React.RefObject<View | null>;
};

const numberFormatters = new Map<string, Intl.NumberFormat>();
const joinedDateFormatters = new Map<string, Intl.DateTimeFormat>();

const formatNumber = (num: number, locale: string): string => {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
    });
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(num);
};

const formatJoinedDate = (iso: string, locale: string): string | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  let formatter = joinedDateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    joinedDateFormatters.set(locale, formatter);
  }
  return formatter.format(date);
};

const formatWebsiteLabel = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return url;
  }
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
  const startConvoMutation = useStartConvo();
  const updateProfileMutation = useUpdateProfile();
  const { showToast } = useToast();

  const handleBskyMessage = async () => {
    if (!profile.did) return;
    try {
      const convo = await startConvoMutation.mutateAsync({ memberDids: [profile.did] });
      router.push(
        `/(tabs)/messages/${encodeURIComponent(convo.id)}?handle=${encodeURIComponent(profile.handle)}` as never,
      );
    } catch (error) {
      if (__DEV__) console.warn('Start convo error:', error);
      showToast({
        type: 'error',
        title: t('profile.sendMessage'),
        message: t('common.somethingWentWrong'),
      });
    }
  };

  const isFollowing = !!profile.viewer?.following;
  const isBlocking = !!profile.viewer?.blocking;
  const isBlockedBy = profile.viewer?.blockedBy;

  // Bluesky DM action — visible whenever we're looking at someone else who
  // we aren't blocking (and who isn't blocking us). The Bluesky chat service
  // gates incoming based on the target's own preference, so a tap that
  // hits a "user only allows DMs from people they follow"-style refusal
  // surfaces as a toast rather than a silent no-op.
  const showBskyMessageButton = !isOwnProfile && !!profile.did && !isBlocking && !isBlockedBy;

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

  const handleSearchPosts = () => {
    searchProfilePosts({ handle: profile.handle });
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
            <View style={styles.displayNameRow}>
              <ThemedText style={styles.displayName}>{profile.displayName || profile.handle}</ThemedText>
              <VerificationBadge
                subjectDid={profile.did}
                verification={profile.verification}
                subjectHandle={profile.handle}
                subjectDisplayName={profile.displayName}
                size={20}
              />
            </View>
            <View style={styles.handleRow}>
              <Pressable style={({ pressed }) => [styles.handleContainer, pressed && { opacity: activeOpacity.default }]} onPress={() => setShowHandleHistory(true)}  hitSlop={hitSlop}>
                <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
                <IconSymbol name="clock" size={fontSize.base} color="#666" style={styles.handleHistoryIcon} />
              </Pressable>
              {profile.pronouns ? (
                <>
                  <ThemedText style={styles.pronounsSeparator}>·</ThemedText>
                  <ThemedText style={styles.pronouns} numberOfLines={1}>{profile.pronouns}</ThemedText>
                </>
              ) : null}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <Pressable style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]} onPress={handleEditProfile}>
                  <ThemedText style={styles.editButtonText}>{t('profile.editProfile')}</ThemedText>
                </Pressable>
                {onSettingsPress ? (
                  <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]} onPress={onSettingsPress}  hitSlop={hitSlop}>
                    <IconSymbol name="gearshape" size={fontSize.xxl} color={semanticColors.systemBlue} />
                  </Pressable>
                ) : null}
                <View style={styles.moreButtonContainer} ref={dropdownRef}>
                  <Pressable style={({ pressed }) => [styles.moreButton, pressed && { opacity: activeOpacity.default }]} onPress={handleDropdownToggle}  hitSlop={hitSlop}>
                    <IconSymbol name="ellipsis" size={fontSize.xxl} color="#ffffff" />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {!isBlockedBy && !profile.viewer?.blocking ? (
                  <Pressable
                    style={({ pressed }) => [isFollowing ? styles.followingButton : styles.followButton, pressed && { opacity: activeOpacity.default }]}
                    onPress={handleFollowPress}
                    disabled={followMutation.isPending}
                    
                  >
                    <ThemedText
                      style={isFollowing ? styles.followingButtonText : styles.followButtonText}
                    >
                      {isFollowing ? t('common.following') : t('common.follow')}
                    </ThemedText>
                  </Pressable>
                ) : null}
                <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]} onPress={handleSearchPosts}  hitSlop={hitSlop}>
                  <IconSymbol name="magnifyingglass" size={fontSize.xxl} color={semanticColors.systemBlue} />
                </Pressable>
                {showBskyMessageButton ? (
                  <Pressable
                    style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]}
                    onPress={handleBskyMessage}
                    
                    hitSlop={hitSlop}
                    disabled={startConvoMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.sendMessage')}
                  >
                    <IconSymbol name="bubble.left" size={fontSize.xxl} color={semanticColors.systemBlue} />
                  </Pressable>
                ) : null}
                <View style={styles.moreButtonContainer} ref={dropdownRef}>
                  <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]} onPress={handleDropdownToggle}  hitSlop={hitSlop}>
                    <IconSymbol name="ellipsis" size={fontSize.xxl} color={semanticColors.systemBlue} />
                  </Pressable>
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

        {/* Website */}
        {profile.website ? (
          <View style={styles.metaRow}>
            <Pressable
              style={({ pressed }) => [styles.metaItem, pressed && { opacity: activeOpacity.default }]}
              onPress={() => void Linking.openURL(profile.website!)}
              
              hitSlop={hitSlop}
            >
              <IconSymbol name="link" size={fontSize.base} color={mutedTextColor} />
              <ThemedText style={[styles.metaLink, { color: semanticColors.systemBlue }]} numberOfLines={1}>
                {formatWebsiteLabel(profile.website)}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Description */}
        {profile.description && (
          <View style={styles.descriptionContainer}>
            <RichText text={profile.description} style={styles.description} />
          </View>
        )}

        {/* Joined date */}
        {profile.createdAt ? (() => {
          const joined = formatJoinedDate(profile.createdAt, currentLocale);
          if (!joined) return null;
          return (
            <View style={styles.joinedRow}>
              <IconSymbol name="calendar" size={fontSize.base} color={mutedTextColor} />
              <ThemedText style={[styles.metaText, { color: mutedTextColor, marginLeft: spacing.xxs }]}>
                {t('profile.joinedDate', { date: joined })}
              </ThemedText>
            </View>
          );
        })() : null}

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
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  handle: {
    fontSize: 15,
    opacity: opacity.secondary,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pronounsSeparator: {
    fontSize: 15,
    opacity: opacity.tertiary,
  },
  pronouns: {
    fontSize: 15,
    opacity: opacity.secondary,
    flexShrink: 1,
  },
  handleHistoryIcon: {
    marginLeft: spacing.sm - spacing.xxs,
    opacity: opacity.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xxs,
    columnGap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 1,
  },
  metaLink: {
    fontSize: fontSize.base,
    flexShrink: 1,
  },
  metaText: {
    fontSize: fontSize.base,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
