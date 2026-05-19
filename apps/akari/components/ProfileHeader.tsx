import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { openExternalLink } from '@/utils/externalLink';

import type { BlueskyVerification } from '@/bluesky-api';
import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { KeytraceClaims } from '@/components/KeytraceClaims';
import { ReportSheet } from '@/components/ReportSheet';
import { Labels } from '@/components/Labels';
import { ProfileActionButtons } from '@/components/ProfileHeader/ProfileActionButtons';
import { ProfileAvatar } from '@/components/ProfileHeader/ProfileAvatar';
import { ProfileBanner } from '@/components/ProfileHeader/ProfileBanner';
import { ProfileBlockedNotice } from '@/components/ProfileHeader/ProfileBlockedNotice';
import { ProfileIdentity } from '@/components/ProfileHeader/ProfileIdentity';
import { searchProfilePosts } from '@/components/profile/profileActions';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, hitSlop, layout, semanticColors, spacing } from '@/constants/tokens';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useStartConvo } from '@/hooks/mutations/useStartConvo';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfirm } from '@/hooks/useConfirm';

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
  const showDropdownRef = useRef(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHandleHistory, setShowHandleHistory] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const borderColor = useBorderColor();
  const mutedTextColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const followMutation = useFollowUser();
  const startConvoMutation = useStartConvo();
  const updateProfileMutation = useUpdateProfile();
  const { showToast } = useToast();
  const confirm = useConfirm();

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
  // Mutual = we follow them and they follow us back. Used to swap the
  // follow button's "Following" label to "Mutuals".
  const isMutual = isFollowing && !!profile.viewer?.followedBy;
  const isBlocking = !!profile.viewer?.blocking;
  const isBlockedBy = profile.viewer?.blockedBy;

  // Bluesky DM action is visible whenever we're looking at someone else who
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
      showDropdownRef.current = false;
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
    const newState = !showDropdownRef.current;
    showDropdownRef.current = newState;
    onDropdownToggle?.(newState);
  };

  const handleFollowPress = () => {
    if (isFollowing) {
      confirm({
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
      confirm({
        title: t('common.success'),
        message: t('profile.profileUpdated'),
        buttons: [{ text: t('common.ok') }],
      });
    } catch {
      confirm({
        title: t('common.error'),
        message: t('profile.profileUpdateError'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  };

  return (
    <View style={webColumnSideBorders(borderColor)}>
      <ProfileBanner banner={profile.banner} />

      <ThemedView style={[styles.profileHeader, { borderBottomColor: borderColor }]}>
        <ProfileAvatar avatar={profile.avatar} displayName={profile.displayName} handle={profile.handle} />

        <View style={styles.profileInfoSection}>
          <ProfileIdentity
            displayName={profile.displayName}
            handle={profile.handle}
            did={profile.did}
            verification={profile.verification}
            pronouns={profile.pronouns}
            onHandlePress={() => setShowHandleHistory(true)}
          />

          <ProfileActionButtons
            state={{
              isOwnProfile,
              isFollowing,
              isMutual,
              isBlocking,
              isBlockedBy,
              showBskyMessageButton,
              followPending: followMutation.isPending,
              startConvoPending: startConvoMutation.isPending,
            }}
            dropdownRef={dropdownRef}
            onEditProfile={handleEditProfile}
            onSettingsPress={onSettingsPress}
            onDropdownToggle={handleDropdownToggle}
            onFollowPress={handleFollowPress}
            onSearchPosts={handleSearchPosts}
            onBskyMessage={handleBskyMessage}
          />
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
              onPress={() => void openExternalLink(profile.website!)}
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

        <ProfileBlockedNotice isBlockedBy={isBlockedBy} isBlocking={isBlocking} borderColor={borderColor} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    position: 'relative',
  },
  profileInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  statsContainer: {
    marginBottom: spacing.sm,
  },
  statText: {
    fontSize: 15,
    lineHeight: 20,
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
});
