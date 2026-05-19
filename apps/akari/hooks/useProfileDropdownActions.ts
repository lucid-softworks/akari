import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';

import { searchProfilePosts } from '@/components/profile/profileActions';
import { useToast } from '@/contexts/ToastContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import type { useProfile } from '@/hooks/queries/useProfile';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

type UseProfileDropdownActionsArgs = {
  profile: ProfileShape | undefined;
  setShowDropdown: (open: boolean) => void;
  setShowReportSheet: (open: boolean) => void;
  setShowListPicker: (open: boolean) => void;
};

/**
 * Centralizes the click handlers attached to the profile dropdown
 * (copy link, search, lists, mute, block, report). Each handler is
 * self-contained so the parent screen only has to wire them onto the
 * dropdown component.
 */
export function useProfileDropdownActions({
  profile,
  setShowDropdown,
  setShowReportSheet,
  setShowListPicker,
}: UseProfileDropdownActionsArgs) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const blockMutation = useBlockUser();
  const muteMutation = useMuteUser();

  const runBlock = useCallback(async () => {
    if (!profile?.did) return;
    const isBlocking = !!profile.viewer?.blocking;
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
    } catch (err) {
      showToast({
        type: 'error',
        title: isBlocking ? t('common.unblock') : t('common.block'),
        message: t('common.somethingWentWrong'),
      });
      if (__DEV__) console.warn('Block error:', err);
    }
  }, [profile, blockMutation, showToast, t]);

  const handleCopyLink = useCallback(async () => {
    const profileHandle = profile?.handle;
    if (!profileHandle) {
      confirm({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
      setShowDropdown(false);
      return;
    }
    try {
      const profileUrl = `https://bsky.app/profile/${profileHandle}`;
      await Clipboard.setStringAsync(profileUrl);
      showToast({
        message: t('profile.linkCopied'),
        type: 'success',
      });
    } catch {
      confirm({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
    } finally {
      setShowDropdown(false);
    }
  }, [profile?.handle, setShowDropdown, showToast, t, confirm]);

  const handleSearchPosts = useCallback(() => {
    searchProfilePosts({
      handle: profile?.handle,
      onComplete: () => setShowDropdown(false),
    });
  }, [profile?.handle, setShowDropdown]);

  const handleAddToLists = useCallback(() => {
    setShowDropdown(false);
    setShowListPicker(true);
  }, [setShowDropdown, setShowListPicker]);

  const handleBlockPress = useCallback(() => {
    setShowDropdown(false);
    if (!profile) return;
    const isBlocking = !!profile.viewer?.blocking;
    confirm({
      title: isBlocking ? t('common.unblock') : t('common.block'),
      message: isBlocking
        ? t('profile.unblockConfirmation', { handle: profile.handle })
        : t('profile.blockConfirmation', { handle: profile.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isBlocking ? t('common.unblock') : t('common.block'),
          style: 'destructive',
          onPress: () => {
            runBlock();
          },
        },
      ],
    });
  }, [profile, runBlock, setShowDropdown, t, confirm]);

  const handleMuteAccount = useCallback(() => {
    setShowDropdown(false);
    if (!profile?.did) return;
    const isMuted = !!profile.viewer?.muted;
    confirm({
      title: isMuted ? t('common.unmute') : t('common.mute'),
      message: isMuted
        ? t('profile.unmuteConfirmation', { handle: profile.handle })
        : t('profile.muteConfirmation', { handle: profile.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isMuted ? t('common.unmute') : t('common.mute'),
          style: 'destructive',
          onPress: () => {
            muteMutation.mutate({
              actor: profile.did!,
              action: isMuted ? 'unmute' : 'mute',
            });
          },
        },
      ],
    });
  }, [muteMutation, profile, setShowDropdown, t, confirm]);

  const handleReportAccount = useCallback(() => {
    setShowDropdown(false);
    setShowReportSheet(true);
  }, [setShowDropdown, setShowReportSheet]);

  return {
    handleCopyLink,
    handleSearchPosts,
    handleAddToLists,
    handleBlockPress,
    handleMuteAccount,
    handleReportAccount,
  };
}
