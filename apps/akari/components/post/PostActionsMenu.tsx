import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListPickerSheet } from '@/components/ListPickerSheet';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { ReportSheet } from '@/components/ReportSheet';
import { useToast } from '@/contexts/ToastContext';
import { useMuteThread } from '@/hooks/mutations/useMuteThread';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { usePinPost } from '@/hooks/mutations/usePinPost';
import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useExistingPostControls } from '@/hooks/queries/usePostControls';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useHiddenContent } from '@/hooks/useHiddenContent';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_POST_CONTROLS, type PostControls } from '@/utils/postControls';

type PostMenuItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type PostActionsMenuProps = {
  visible: boolean;
  canTranslate: boolean;
  postText?: string;
  postUri?: string;
  postCid?: string;
  authorDid?: string;
  onDismiss: () => void;
  onTranslatePress: () => void;
};

// Global ref to dismiss any currently open menu when a new one opens
let activeMenuDismiss: (() => void) | null = null;

export const PostActionsMenu = React.memo(function PostActionsMenu({
  visible,
  canTranslate,
  postText,
  postUri,
  postCid,
  authorDid,
  onDismiss,
  onTranslatePress,
}: PostActionsMenuProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showControlsSheet, setShowControlsSheet] = useState(false);
  const postControlsMutation = usePostControls();
  // Fetch existing threadgate/postgate state when the user is the author —
  // only enabled while the sheet is open to skip the network round-trip on
  // every menu render.
  const existingControls = useExistingPostControls(showControlsSheet ? postUri : undefined);

  // On web, close the dropdown when clicking anywhere or when another menu opens
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    // Dismiss any previously open menu
    if (activeMenuDismiss && activeMenuDismiss !== onDismiss) {
      activeMenuDismiss();
    }
    activeMenuDismiss = onDismiss;

    const handler = () => {
      if (activeMenuDismiss === onDismiss) activeMenuDismiss = null;
      onDismiss();
    };
    const id = requestAnimationFrame(() => window.addEventListener('click', handler, { once: true }));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('click', handler);
      if (activeMenuDismiss === onDismiss) activeMenuDismiss = null;
    };
  }, [visible, onDismiss]);

  const menuBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const handleBarColor = useThemeColor({ light: '#d1d1d6', dark: '#3a3a3c' }, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const borderColor = useThemeColor({}, 'border');

  const muteMutation = useMuteUser();
  const muteThreadMutation = useMuteThread();
  const pinPostMutation = usePinPost();
  const { hidePost, hideAccount } = useHiddenContent();
  const { data: currentAccount } = useCurrentAccount();
  const { data: ownProfile } = useProfile(currentAccount?.did);
  const isOwnPost = !!authorDid && !!currentAccount?.did && authorDid === currentAccount.did;
  const isCurrentlyPinned = isOwnPost && !!postUri && ownProfile?.pinnedPost?.uri === postUri;

  const handlePinPost = useCallback(() => {
    if (!postUri || !postCid) return;
    if (isCurrentlyPinned) {
      pinPostMutation.mutate(
        { action: 'unpin' },
        {
          onSuccess: () => showToast({ message: t('post.unpinnedToast'), type: 'success' }),
          onError: () => showToast({ message: t('common.error'), type: 'error' }),
        },
      );
    } else {
      pinPostMutation.mutate(
        { action: 'pin', uri: postUri, cid: postCid },
        {
          onSuccess: () => showToast({ message: t('post.pinnedToast'), type: 'success' }),
          onError: () => showToast({ message: t('common.error'), type: 'error' }),
        },
      );
    }
    onDismiss();
  }, [postUri, postCid, isCurrentlyPinned, pinPostMutation, showToast, t, onDismiss]);

  const handleCopyText = useCallback(() => {
    if (postText) {
      void Clipboard.setStringAsync(postText).then(() => {
        showToast({ message: t('common.copiedToClipboard'), type: 'success' });
      });
    }
    onDismiss();
  }, [postText, onDismiss, showToast, t]);

  const handleMuteAccount = useCallback(() => {
    if (authorDid) {
      muteMutation.mutate({ actor: authorDid, action: 'mute' });
    }
    onDismiss();
  }, [authorDid, muteMutation, onDismiss]);

  const handleMuteThread = useCallback(() => {
    // Best-effort: use the post's own URI as the thread root. If the
    // user invoked this from a reply rather than the root post, they
    // may need to mute again from the root for full coverage. We don't
    // have the conversation root plumbed all the way through PostCard
    // yet; revisit once that data flows down.
    if (!postUri) return;
    muteThreadMutation.mutate(
      { root: postUri, action: 'mute' },
      {
        onSuccess: () =>
          showToast({ message: t('post.actions.threadMuted'), type: 'success' }),
        onError: () =>
          showToast({ message: t('common.somethingWentWrong'), type: 'error' }),
      },
    );
    onDismiss();
  }, [postUri, muteThreadMutation, onDismiss, showToast, t]);

  const handleHidePost = useCallback(() => {
    if (postUri) {
      hidePost(postUri);
      showToast({ message: t('post.actions.postHidden'), type: 'success' });
    }
    onDismiss();
  }, [postUri, hidePost, onDismiss, showToast, t]);

  const handleHideAccount = useCallback(() => {
    if (authorDid) {
      hideAccount(authorDid);
      showToast({ message: t('post.actions.accountHidden'), type: 'success' });
    }
    onDismiss();
  }, [authorDid, hideAccount, onDismiss, showToast, t]);

  const menuActions = useMemo<PostMenuItem[]>(
    () => {
      const items: PostMenuItem[] = [
        { key: 'translate', icon: 'character.book.closed', label: t('post.actions.translate'), onPress: onTranslatePress, disabled: !canTranslate },
        { key: 'copyText', icon: 'doc.on.doc', label: t('post.actions.copyText'), onPress: handleCopyText, disabled: !postText },
      ];

      if (isOwnPost) {
        items.push({
          key: 'pinPost',
          icon: isCurrentlyPinned ? 'pin.slash' : 'pin',
          label: isCurrentlyPinned ? t('post.unpinFromProfile') : t('post.pinToProfile'),
          onPress: handlePinPost,
          disabled: !postUri || !postCid,
        });
        items.push({
          key: 'editControls',
          icon: 'bubble.left.and.bubble.right',
          label: t('post.controls.edit'),
          onPress: () => {
            onDismiss();
            setShowControlsSheet(true);
          },
          disabled: !postUri,
        });
      }

      items.push(
        { key: 'addToLists', icon: 'list.bullet', label: t('profile.addToLists'), onPress: () => { onDismiss(); setShowListPicker(true); }, disabled: !authorDid },
        { key: 'muteThread', icon: 'bell.slash', label: t('post.actions.muteThread'), onPress: handleMuteThread, disabled: !postUri },
        { key: 'muteAccount', icon: 'speaker.slash', label: t('profile.muteAccount'), onPress: handleMuteAccount, disabled: !authorDid },
        { key: 'hidePost', icon: 'eye.slash', label: t('post.actions.hidePost'), onPress: handleHidePost, disabled: !postUri },
        { key: 'hideAccount', icon: 'person.crop.circle.badge.xmark', label: t('post.actions.hideAccount'), onPress: handleHideAccount, disabled: !authorDid },
        { key: 'reportPost', icon: 'exclamationmark.triangle', label: t('profile.reportPost'), onPress: () => { onDismiss(); setShowReportSheet(true); }, destructive: true },
      );

      return items;
    },
    [canTranslate, postText, authorDid, postUri, postCid, isOwnPost, isCurrentlyPinned, handleCopyText, handleMuteAccount, handleMuteThread, handleHidePost, handleHideAccount, handlePinPost, onTranslatePress, onDismiss, t],
  );

  const wrapPress = Platform.OS === 'web'
    ? (handler: (() => void) | undefined) => (e: any) => { e?.stopPropagation?.(); e?.preventDefault?.(); handler?.(); }
    : (handler: (() => void) | undefined) => handler;

  const menuItems = menuActions.map((item) => (
    <TouchableOpacity
      key={item.key}
      style={styles.menuItem}
      onPress={item.disabled ? undefined : wrapPress(item.onPress)}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled }}
      activeOpacity={item.disabled ? 1 : activeOpacity.default}
    >
      <IconSymbol
        name={item.icon as any}
        size={20}
        color={item.destructive ? semanticColors.danger : iconColor}
        style={item.disabled ? styles.menuItemDisabled : undefined}
      />
      <ThemedText
        style={[
          styles.menuItemText,
          item.destructive && styles.menuItemTextDestructive,
          item.disabled && styles.menuItemDisabled,
        ]}
      >
        {item.label}
      </ThemedText>
    </TouchableOpacity>
  ));

  return (
    <>
    {Platform.OS === 'web' ? (
      visible ? (
          <ThemedView
            style={[styles.webDropdown, { backgroundColor: menuBackgroundColor, borderColor: handleBarColor }]}
            {...{ onClick: (e: any) => e.stopPropagation() }}
          >
            {menuItems}
          </ThemedView>
      ) : null
    ) : (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Pressable
            style={[styles.sheetWrapper, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedView style={[styles.sheet, { backgroundColor: menuBackgroundColor, borderColor }]}>
              {menuActions.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                  ) : null}
                  <TouchableOpacity
                    style={[styles.sheetItem, item.disabled && styles.menuItemDisabled]}
                    onPress={item.disabled ? undefined : item.onPress}
                    disabled={item.disabled}
                    accessibilityRole="menuitem"
                    accessibilityState={{ disabled: item.disabled }}
                    activeOpacity={item.disabled ? 1 : activeOpacity.default}
                  >
                    <IconSymbol
                      name={item.icon as any}
                      size={22}
                      color={item.destructive ? semanticColors.danger : iconColor}
                    />
                    <ThemedText
                      style={[
                        styles.sheetItemText,
                        item.destructive && styles.menuItemTextDestructive,
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
    )}
    <ReportSheet
      visible={showReportSheet}
      onDismiss={() => setShowReportSheet(false)}
      subject={postUri && postCid ? { type: 'post', uri: postUri, cid: postCid } : authorDid ? { type: 'account', did: authorDid } : null}
    />
    <ListPickerSheet
      visible={showListPicker}
      onDismiss={() => setShowListPicker(false)}
      subjectDid={authorDid}
    />
    {postUri ? (
      <PostControlsSheet
        visible={showControlsSheet}
        // Prefill with the post's current threadgate/postgate state so the
        // user can tweak rather than redo from scratch. Falls back to
        // defaults if the records are missing or still loading.
        initialControls={existingControls.data ?? DEFAULT_POST_CONTROLS}
        onDismiss={() => setShowControlsSheet(false)}
        onSave={(next: PostControls) => {
          postControlsMutation.mutate(
            { postUri, controls: next },
            {
              onSuccess: () =>
                showToast({ message: t('post.controls.updated'), type: 'success' }),
              onError: () => showToast({ message: t('common.error'), type: 'error' }),
            },
          );
          setShowControlsSheet(false);
        }}
      />
    ) : null}
    </>
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
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetItemText: {
    fontSize: fontSize.lg,
    flex: 1,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: layout.hairline,
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
  menuItemDisabled: {
    opacity: opacity.disabled,
  },
  webDropdown: {
    position: 'absolute' as any,
    right: 0,
    bottom: 40,
    zIndex: 9999,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
