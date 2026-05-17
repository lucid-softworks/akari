import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileActionButtonsState = {
  isOwnProfile: boolean;
  isFollowing: boolean;
  isBlocking: boolean;
  isBlockedBy: boolean | undefined;
  showBskyMessageButton: boolean;
  followPending: boolean;
  startConvoPending: boolean;
};

type ProfileActionButtonsProps = {
  state: ProfileActionButtonsState;
  dropdownRef?: React.RefObject<View | null>;
  onEditProfile: () => void;
  onSettingsPress?: () => void;
  onDropdownToggle: () => void;
  onFollowPress: () => void;
  onSearchPosts: () => void;
  onBskyMessage: () => void;
};

export function ProfileActionButtons({
  state,
  dropdownRef,
  onEditProfile,
  onSettingsPress,
  onDropdownToggle,
  onFollowPress,
  onSearchPosts,
  onBskyMessage,
}: ProfileActionButtonsProps) {
  const {
    isOwnProfile,
    isFollowing,
    isBlocking,
    isBlockedBy,
    showBskyMessageButton,
    followPending,
    startConvoPending,
  } = state;
  const { t } = useTranslation();

  return (
    <View style={styles.actionButtons}>
      {isOwnProfile ? (
        <>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
            onPress={onEditProfile}
          >
            <ThemedText style={styles.editButtonText}>{t('profile.editProfile')}</ThemedText>
          </Pressable>
          {onSettingsPress ? (
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]}
              onPress={onSettingsPress}
              hitSlop={hitSlop}
            >
              <IconSymbol name="gearshape" size={fontSize.xxl} color={semanticColors.systemBlue} />
            </Pressable>
          ) : null}
          <View style={styles.moreButtonContainer} ref={dropdownRef}>
            <Pressable
              style={({ pressed }) => [styles.moreButton, pressed && { opacity: activeOpacity.default }]}
              onPress={onDropdownToggle}
              hitSlop={hitSlop}
            >
              <IconSymbol name="ellipsis" size={fontSize.xxl} color="#ffffff" />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {!isBlockedBy && !isBlocking ? (
            <Pressable
              style={({ pressed }) => [
                isFollowing ? styles.followingButton : styles.followButton,
                pressed && { opacity: activeOpacity.default },
              ]}
              onPress={onFollowPress}
              disabled={followPending}
            >
              <ThemedText style={isFollowing ? styles.followingButtonText : styles.followButtonText}>
                {isFollowing ? t('common.following') : t('common.follow')}
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]}
            onPress={onSearchPosts}
            hitSlop={hitSlop}
          >
            <IconSymbol name="magnifyingglass" size={fontSize.xxl} color={semanticColors.systemBlue} />
          </Pressable>
          {showBskyMessageButton ? (
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]}
              onPress={onBskyMessage}
              hitSlop={hitSlop}
              disabled={startConvoPending}
              accessibilityRole="button"
              accessibilityLabel={t('profile.sendMessage')}
            >
              <IconSymbol name="bubble.left" size={fontSize.xxl} color={semanticColors.systemBlue} />
            </Pressable>
          ) : null}
          <View style={styles.moreButtonContainer} ref={dropdownRef}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: activeOpacity.default }]}
              onPress={onDropdownToggle}
              hitSlop={hitSlop}
            >
              <IconSymbol name="ellipsis" size={fontSize.xxl} color={semanticColors.systemBlue} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
