import React, { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

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

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    void Haptics.impactAsync(
                      item.destructive ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
                    );
                    item.onPress();
                  }}
                  accessibilityRole="menuitem"
                  activeOpacity={activeOpacity.default}
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
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ThemedView>
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
