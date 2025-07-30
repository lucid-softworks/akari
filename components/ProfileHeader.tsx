import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Labels } from '@/components/Labels';
import { RichText } from '@/components/RichText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
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
};

const formatNumber = (num: number, locale: string): string => {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  });
  return formatter.format(num);
};

export function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const borderColor = useBorderColor();
  const followMutation = useFollowUser();
  const blockMutation = useBlockUser();

  const dropdownBackgroundColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#1c1c1e',
    },
    'background',
  );

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
    setShowDropdown(!showDropdown);
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
            <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity style={styles.editButton} onPress={() => {}}>
                  <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                </TouchableOpacity>
                <View style={styles.moreButtonContainer}>
                  <TouchableOpacity style={styles.moreButton} onPress={handleDropdownToggle}>
                    <IconSymbol name="ellipsis" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  {showDropdown && (
                    <ThemedView
                      style={[styles.dropdown, { backgroundColor: dropdownBackgroundColor, borderColor: borderColor }]}
                    >
                      <TouchableOpacity style={styles.dropdownItem} onPress={handleSearchPosts}>
                        <ThemedText style={styles.dropdownText}>{t('common.search')}</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dropdownItem} onPress={handleCopyLink}>
                        <ThemedText style={styles.dropdownText}>{t('profile.copyLink')}</ThemedText>
                      </TouchableOpacity>
                    </ThemedView>
                  )}
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPosts}>
                  <IconSymbol name="magnifyingglass" size={20} color="#007AFF" />
                </TouchableOpacity>
                {!isBlockedBy && (
                  <View style={styles.moreButtonContainer}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleDropdownToggle}>
                      <IconSymbol name="ellipsis" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    {showDropdown && (
                      <ThemedView
                        style={[styles.dropdown, { backgroundColor: dropdownBackgroundColor, borderColor: borderColor }]}
                      >
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleCopyLink}>
                          <ThemedText style={styles.dropdownText}>{t('profile.copyLink')}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleSearchPosts}>
                          <ThemedText style={styles.dropdownText}>{t('common.search')}</ThemedText>
                        </TouchableOpacity>
                        <View style={[styles.dropdownSeparator, { borderColor: borderColor }]} />
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleAddToLists}>
                          <ThemedText style={styles.dropdownText}>{t('profile.addToLists')}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleMuteAccount}>
                          <ThemedText style={styles.dropdownText}>
                            {profile.viewer?.muted ? t('common.unmute') : t('profile.muteAccount')}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleBlockPress}>
                          <ThemedText style={[styles.dropdownText, styles.dropdownTextDestructive]}>
                            {isBlocking ? t('common.unblock') : t('common.block')}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleReportAccount}>
                          <ThemedText style={[styles.dropdownText, styles.dropdownTextDestructive]}>
                            {t('profile.reportAccount')}
                          </ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    )}
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 140,
    zIndex: 999999,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownSeparator: {
    height: 1,
    borderTopWidth: 1,
    marginVertical: 4,
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownTextDestructive: {
    color: '#c62828',
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
