import { useCallback, useEffect } from 'react';
import { ActionSheetIOS, Platform } from 'react-native';

import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

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
  isBlocking,
  isMuted,
  isOwnProfile,
}: ProfileDropdownProps) {
  const { t } = useTranslation();

  const showSheet = useCallback(() => {
    if (isOwnProfile) {
      const options = [
        t('common.search'),
        t('profile.copyLink'),
        t('common.cancel'),
      ];
      const cancelIndex = options.length - 1;

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: cancelIndex },
          (index) => {
            if (index === 0) onSearchPosts();
            else if (index === 1) onCopyLink();
          },
        );
      } else {
        // Fallback for Android/web
        showAlert({
          title: '',
          message: '',
          buttons: [
            { text: t('common.search'), onPress: onSearchPosts },
            { text: t('profile.copyLink'), onPress: onCopyLink },
            { text: t('common.cancel') },
          ],
        });
      }
    } else {
      const muteLabel = isMuted ? t('common.unmute') : t('profile.muteAccount');
      const blockLabel = isBlocking ? t('common.unblock') : t('common.block');
      const options = [
        t('profile.copyLink'),
        t('common.search'),
        t('profile.addToLists'),
        muteLabel,
        blockLabel,
        t('profile.reportAccount'),
        t('common.cancel'),
      ];
      const cancelIndex = options.length - 1;
      const destructiveIndices = [4, 5]; // block, report

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: cancelIndex,
            destructiveButtonIndex: destructiveIndices[0],
          },
          (index) => {
            if (index === 0) onCopyLink();
            else if (index === 1) onSearchPosts();
            else if (index === 2) onAddToLists();
            else if (index === 3) onMuteAccount();
            else if (index === 4) onBlockPress();
            else if (index === 5) onReportAccount();
          },
        );
      } else {
        showAlert({
          title: '',
          message: '',
          buttons: [
            { text: t('profile.copyLink'), onPress: onCopyLink },
            { text: t('common.search'), onPress: onSearchPosts },
            { text: t('profile.addToLists'), onPress: onAddToLists },
            { text: muteLabel, onPress: onMuteAccount },
            { text: blockLabel, onPress: onBlockPress, style: 'destructive' },
            { text: t('profile.reportAccount'), onPress: onReportAccount, style: 'destructive' },
            { text: t('common.cancel') },
          ],
        });
      }
    }
  }, [
    isOwnProfile, isMuted, isBlocking, t,
    onCopyLink, onSearchPosts, onAddToLists, onMuteAccount, onBlockPress, onReportAccount,
  ]);

  useEffect(() => {
    if (isVisible) {
      showSheet();
    }
  }, [isVisible, showSheet]);

  // No UI to render — uses native action sheet
  return null;
}
