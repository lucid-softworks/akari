import React, { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WebPortalDropdown, type WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import { spacing, radius, fontSize, fontWeight, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

// Rough height of the menu used by `WebPortalDropdown` to decide
// whether to flip the menu above the anchor when there isn't room
// below. Doesn't need to be exact — six rows × ~52px + borders.
const WEB_PROFILE_MENU_ESTIMATED_HEIGHT = 320;

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
};

type ProfileDropdownProps = {
  isVisible: boolean;
  onDismiss: () => void;
  onCopyLink: () => void;
  onSearchPosts: () => void;
  onAddToLists: () => void;
  onMuteAccount: () => void;
  onBlockPress: () => void;
  onReportAccount: () => void;
  /** Optional — only set when both viewer and target have a Germ declaration
   *  and the target's `showButtonTo` audience permits the viewer. */
  onMessageOnGerm?: () => void;
  isFollowing: boolean;
  isBlocking: boolean;
  isMuted: boolean;
  isOwnProfile: boolean;
  /** Position of the `…` trigger as measured at open time. When set
   *  on web we render a portaled dropdown anchored to it instead of
   *  the bottom-sheet shape used on native. */
  anchorRect?: WebPortalAnchorRect | null;
};

export const ProfileDropdown = React.memo(function ProfileDropdown({
  isVisible,
  onDismiss,
  onCopyLink,
  onSearchPosts,
  onAddToLists,
  onMuteAccount,
  onBlockPress,
  onReportAccount,
  onMessageOnGerm,
  isBlocking,
  isMuted,
  isOwnProfile,
  anchorRect,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const menuItems = useMemo<MenuItem[]>(() => {
    if (isOwnProfile) {
      return [
        { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: onSearchPosts },
        { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: onCopyLink },
      ];
    }

    const items: MenuItem[] = [
      { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: onCopyLink },
      { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: onSearchPosts },
      { key: 'addToLists', icon: 'list.bullet', label: t('profile.addToLists'), onPress: onAddToLists },
    ];
    if (onMessageOnGerm) {
      items.push({
        key: 'messageOnGerm',
        icon: 'arrow.up.right.square',
        label: t('germ.messageOnGerm'),
        onPress: onMessageOnGerm,
      });
    }
    items.push(
      { key: 'mute', icon: 'speaker.slash', label: isMuted ? t('common.unmute') : t('profile.muteAccount'), onPress: onMuteAccount },
      { key: 'block', icon: 'hand.raised.fill', label: isBlocking ? t('common.unblock') : t('common.block'), onPress: onBlockPress, destructive: true },
      { key: 'report', icon: 'exclamationmark.triangle', label: t('profile.reportAccount'), onPress: onReportAccount, destructive: true },
    );
    return items;
  }, [isOwnProfile, isMuted, isBlocking, t, onCopyLink, onSearchPosts, onAddToLists, onMuteAccount, onBlockPress, onReportAccount, onMessageOnGerm]);

  const menuBody = (
    <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
      {menuItems.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
          <Pressable
            style={({ pressed }) => [styles.item, pressed && { opacity: activeOpacity.default }]}
            onPress={() => {
              void Haptics.impactAsync(
                item.destructive ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
              );
              item.onPress();
            }}
            accessibilityRole="menuitem"
          >
            <IconSymbol
              name={item.icon as any}
              size={22}
              color={item.destructive ? semanticColors.danger : iconColor}
            />
            <ThemedText
              style={[
                styles.itemText,
                { color: item.destructive ? semanticColors.danger : textColor },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        </React.Fragment>
      ))}
    </ThemedView>
  );

  // Web with an anchor → portaled dropdown anchored to the `…`
  // trigger, matching the post `…` menu and repost-sheet pattern.
  // The portal renders into `document.body` so the menu escapes any
  // ancestor `overflow: hidden` (the profile header + tab container
  // both clip on web). Without an anchor (older callers, no
  // measurement available) we fall through to the native bottom
  // sheet so the menu still works.
  if (Platform.OS === 'web' && anchorRect) {
    return (
      <WebPortalDropdown
        visible={isVisible}
        anchorRect={anchorRect}
        estimatedHeight={WEB_PROFILE_MENU_ESTIMATED_HEIGHT}
        onDismiss={onDismiss}
      >
        <ThemedView style={[styles.webDropdown, { backgroundColor: sheetBg, borderColor }]}>
          {menuBody}
        </ThemedView>
      </WebPortalDropdown>
    );
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(event) => event.stopPropagation()}
        >
          {menuBody}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: { maxWidth: 420, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  // The portaled web dropdown sizes to its content (WebPortalDropdown
  // anchors via `right:` so we don't need a width); the inner sheet
  // keeps the same compact card chrome as the post `…` menu.
  webDropdown: {
    minWidth: 220,
    maxWidth: 320,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  itemText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  divider: {
    height: layout.hairline,
  },
});
