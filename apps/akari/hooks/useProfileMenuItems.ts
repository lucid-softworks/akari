import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

import { searchProfilePosts } from '@/components/profile/profileActions';
import type { MenuItem } from '@/components/ui/Menu';
import { useToast } from '@/contexts/ToastContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import type { useProfile } from '@/hooks/queries/useProfile';
import { useConfirm } from '@/hooks/useConfirm';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

type UseProfileMenuItemsArgs = {
  profile: ProfileShape | undefined;
  isOwnProfile: boolean;
  onOpenReportSheet: () => void;
  onOpenListPicker: () => void;
  /** Optional: when present, a Germ "message on Germ" row is appended for non-self profiles. */
  onMessageOnGerm?: () => void;
};

/**
 * Builds the `MenuItem[]` rendered by the profile `…` menu. Each row's
 * `onPress` runs the action and any required follow-up dialog; the
 * shared Menu primitive closes itself after the press, so callers no
 * longer need to track the menu's open state.
 *
 * Destructive rows (block / report) fire a heavier haptic on press;
 * non-destructive rows fire a light tick.
 */
export function useProfileMenuItems({
  profile,
  isOwnProfile,
  onOpenReportSheet,
  onOpenListPicker,
  onMessageOnGerm,
}: UseProfileMenuItemsArgs): MenuItem[] {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { isGuest, promptSignIn } = useRequireAuth();
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
      return;
    }
    try {
      const profileUrl = `https://bsky.app/profile/${profileHandle}`;
      await Clipboard.setStringAsync(profileUrl);
      showToast({ message: t('profile.linkCopied'), type: 'success' });
    } catch {
      confirm({
        title: t('common.error'),
        message: t('profile.linkCopyError'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  }, [profile?.handle, showToast, t, confirm]);

  const handleSearchPosts = useCallback(() => {
    searchProfilePosts({ handle: profile?.handle });
  }, [profile?.handle]);

  const handleAddToLists = useCallback(() => {
    onOpenListPicker();
  }, [onOpenListPicker]);

  const handleBlockPress = useCallback(() => {
    if (isGuest) {
      promptSignIn();
      return;
    }
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
  }, [profile, runBlock, t, confirm, isGuest, promptSignIn]);

  const handleMuteAccount = useCallback(() => {
    if (isGuest) {
      promptSignIn();
      return;
    }
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
  }, [muteMutation, profile, t, confirm, isGuest, promptSignIn]);

  const handleReportAccount = useCallback(() => {
    if (isGuest) {
      promptSignIn();
      return;
    }
    onOpenReportSheet();
  }, [onOpenReportSheet, isGuest, promptSignIn]);

  return useMemo<MenuItem[]>(() => {
    const wrap = (destructive: boolean, fn: () => void) => () => {
      void Haptics.impactAsync(
        destructive ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
      fn();
    };

    if (isOwnProfile) {
      return [
        { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: wrap(false, handleSearchPosts) },
        { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: wrap(false, handleCopyLink) },
      ];
    }

    const isBlocking = !!profile?.viewer?.blocking;
    const isMuted = !!profile?.viewer?.muted;

    const items: MenuItem[] = [
      { key: 'copyLink', icon: 'link', label: t('profile.copyLink'), onPress: wrap(false, handleCopyLink) },
      { key: 'search', icon: 'magnifyingglass', label: t('common.search'), onPress: wrap(false, handleSearchPosts) },
      { key: 'addToLists', icon: 'list.bullet', label: t('profile.addToLists'), onPress: wrap(false, handleAddToLists) },
    ];

    if (onMessageOnGerm) {
      items.push({
        key: 'messageOnGerm',
        icon: 'arrow.up.right.square',
        label: t('germ.messageOnGerm'),
        onPress: wrap(false, onMessageOnGerm),
      });
    }

    items.push(
      {
        key: 'mute',
        icon: 'speaker.slash',
        label: isMuted ? t('common.unmute') : t('profile.muteAccount'),
        onPress: wrap(false, handleMuteAccount),
      },
      {
        key: 'block',
        icon: 'hand.raised.fill',
        label: isBlocking ? t('common.unblock') : t('common.block'),
        destructive: true,
        onPress: wrap(true, handleBlockPress),
      },
      {
        key: 'report',
        icon: 'exclamationmark.triangle',
        label: t('profile.reportAccount'),
        destructive: true,
        onPress: wrap(true, handleReportAccount),
      },
    );

    return items;
  }, [
    isOwnProfile,
    profile?.viewer?.blocking,
    profile?.viewer?.muted,
    t,
    handleCopyLink,
    handleSearchPosts,
    handleAddToLists,
    handleMuteAccount,
    handleBlockPress,
    handleReportAccount,
    onMessageOnGerm,
  ]);
}
