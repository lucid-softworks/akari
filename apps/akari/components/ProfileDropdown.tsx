import React, { useMemo } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
  isBlocking,
  isMuted,
  isOwnProfile,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const handleBarColor = useThemeColor({ light: '#d1d1d6', dark: '#3a3a3c' }, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  const menuItems = useMemo<MenuItem[]>(() => {
    if (isOwnProfile) {
      return [
        { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: onSearchPosts },
        { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: onCopyLink },
      ];
    }

    return [
      { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: onCopyLink },
      { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: onSearchPosts },
      { key: 'addToLists', icon: 'list.bullet', label: t('profile.addToLists'), onPress: onAddToLists },
      { key: 'mute', icon: 'speaker.slash', label: isMuted ? t('common.unmute') : t('profile.muteAccount'), onPress: onMuteAccount },
      { key: 'block', icon: 'hand.raised.fill', label: isBlocking ? t('common.unblock') : t('common.block'), onPress: onBlockPress, destructive: true },
      { key: 'report', icon: 'exclamationmark.triangle', label: t('profile.reportAccount'), onPress: onReportAccount, destructive: true },
    ];
  }, [isOwnProfile, isMuted, isBlocking, t, onCopyLink, onSearchPosts, onAddToLists, onMuteAccount, onBlockPress, onReportAccount]);

  const isWeb = Platform.OS === 'web';
  const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
    Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

  const sheetContent = (
    <ThemedView
      style={[
        styles.sheet,
        isWeb ? styles.webSheet : styles.nativeSheet,
        {
          backgroundColor: sheetBg,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      {isWeb ? (
        <View style={styles.handleBarContainer}>
          <View style={[styles.handleBar, { backgroundColor: handleBarColor }]} />
        </View>
      ) : null}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={item.onPress}
            accessibilityRole="menuitem"
            activeOpacity={activeOpacity.default}
          >
            <IconSymbol
              name={item.icon as any}
              size={20}
              color={item.destructive ? semanticColors.danger : iconColor}
            />
            <ThemedText
              style={[
                styles.menuItemText,
                item.destructive && styles.menuItemTextDestructive,
              ]}
            >
              {item.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onDismiss}
        activeOpacity={activeOpacity.default}
      >
        <ThemedText style={styles.cancelText}>{t('common.cancel')}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={onDismiss}
    >
      {isWeb ? (
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>{sheetContent}</TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        sheetContent
      )}
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
  },
  nativeSheet: {
    flex: 1,
  },
  webSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
    maxWidth: 420,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemText: {
    fontSize: fontSize.lg,
    flex: 1,
  },
  menuItemTextDestructive: {
    color: semanticColors.danger,
  },
  cancelButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: layout.hairline,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
