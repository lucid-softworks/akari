import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';

type ProfileDropdownProps = {
  isVisible: boolean;
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
  style?: any;
};

export function ProfileDropdown({
  isVisible,
  onCopyLink,
  onSearchPosts,
  onAddToLists,
  onMuteAccount,
  onBlockPress,
  onReportAccount,
  isFollowing,
  isBlocking,
  isMuted,
  isOwnProfile,
  style,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const { colors } = useAppTheme();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);

  if (!isVisible) return null;

  return (
    <ThemedView style={[styles.dropdown, themedStyles.dropdown, { borderColor: borderColor }, style]}>
      {isOwnProfile ? (
        <>
          <TouchableOpacity style={styles.dropdownItem} onPress={onSearchPosts}>
            <ThemedText style={styles.dropdownText}>{t('common.search')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={onCopyLink}>
            <ThemedText style={styles.dropdownText}>{t('profile.copyLink')}</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.dropdownItem} onPress={onCopyLink}>
            <ThemedText style={styles.dropdownText}>{t('profile.copyLink')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={onSearchPosts}>
            <ThemedText style={styles.dropdownText}>{t('common.search')}</ThemedText>
          </TouchableOpacity>
          <View style={[styles.dropdownSeparator, { borderColor: borderColor }]} />
          <TouchableOpacity style={styles.dropdownItem} onPress={onAddToLists}>
            <ThemedText style={styles.dropdownText}>{t('profile.addToLists')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={onMuteAccount}>
            <ThemedText style={styles.dropdownText}>{isMuted ? t('common.unmute') : t('profile.muteAccount')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={onBlockPress}>
            <ThemedText style={[styles.dropdownText, themedStyles.dropdownTextDestructive]}>
              {isBlocking ? t('common.unblock') : t('common.block')}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={onReportAccount}>
            <ThemedText style={[styles.dropdownText, themedStyles.dropdownTextDestructive]}>
              {t('profile.reportAccount')}
            </ThemedText>
          </TouchableOpacity>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 140,
    zIndex: 9999999,
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
});

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    dropdown: {
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      borderColor: colors.borderMuted,
    },
    dropdownTextDestructive: {
      color: colors.danger,
    },
  });
}
