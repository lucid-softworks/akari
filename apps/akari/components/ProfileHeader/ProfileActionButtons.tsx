import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, semanticColors, spacing, zIndex } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileActionButtonsState = {
  isOwnProfile: boolean;
  isFollowing: boolean;
  /** Viewer follows the subject AND the subject follows the viewer back.
   *  Switches the button label to "Mutuals" instead of plain "Following". */
  isMutual: boolean;
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
  /** Called when the `…` button is tapped. The optional rect carries
   *  the trigger's bounding box (measured against the viewport on
   *  web, against the window on native) so the consumer can anchor a
   *  portaled menu next to it. Falls back to `undefined` when we
   *  can't measure (no ref, missing DOM API). */
  onDropdownToggle: (rect?: WebPortalAnchorRect) => void;
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
    isMutual,
    isBlocking,
    isBlockedBy,
    showBskyMessageButton,
    followPending,
    startConvoPending,
  } = state;
  const { t } = useTranslation();

  // Measure the `…` button at tap time so the portaled web menu can
  // anchor itself next to it. Mirrors the pattern used by
  // `PostActions.handleMorePress`. Native passes the same rect shape
  // back via `measureInWindow` so consumers don't have to branch.
  const handleMoreToggle = useCallback(() => {
    const node = dropdownRef?.current;
    if (!node) {
      onDropdownToggle();
      return;
    }
    if (Platform.OS === 'web') {
      const el = node as unknown as { getBoundingClientRect?: () => DOMRect };
      if (typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect();
        onDropdownToggle({
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          width: r.width,
          height: r.height,
        });
        return;
      }
    }
    node.measureInWindow((x, y, width, height) => {
      onDropdownToggle({ top: y, bottom: y + height, left: x, width, height });
    });
  }, [dropdownRef, onDropdownToggle]);

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
              onPress={handleMoreToggle}
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
                {isFollowing
                  ? isMutual
                    ? t('common.mutuals')
                    : t('common.following')
                  : t('common.follow')}
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
              onPress={handleMoreToggle}
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
    zIndex: zIndex.dropdown,
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
