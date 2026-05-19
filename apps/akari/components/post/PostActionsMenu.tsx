import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebPortalDropdown } from '@/components/post/WebPortalDropdown';

import { ListPickerSheet } from '@/components/ListPickerSheet';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import {
  AddCommunityNoteModal,
  RequestCommunityNoteModal,
} from '@/components/post/CommunityNoteContributor';
import { PostDebugInspector } from '@/components/post/PostDebugInspector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout, hexToRgba } from '@/constants/tokens';
import { ReportSheet } from '@/components/ReportSheet';
import { useDialogManager } from '@/contexts/DialogContext';
import { useToast } from '@/contexts/ToastContext';
import { useMuteThread } from '@/hooks/mutations/useMuteThread';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { usePinPost } from '@/hooks/mutations/usePinPost';
import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useSendFeedInteraction } from '@/hooks/mutations/useSendFeedInteraction';
import { useExistingPostControls } from '@/hooks/queries/usePostControls';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useIsCommunityNotesContributor } from '@/hooks/useCommunityNotesSettings';
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

type AnchorRect = { top: number; bottom: number; left: number; width: number; height: number };

type PostActionsMenuProps = {
  visible: boolean;
  canTranslate: boolean;
  postText?: string;
  postUri?: string;
  postCid?: string;
  authorDid?: string;
  /** When set to an algorithmic feed's at:// URI, the menu surfaces
   *  "Show more / less like this" rows that send interaction events
   *  back to that feed gen. */
  feedUri?: string;
  feedContext?: string;
  /** Bounding rect of the More button that opened this menu. Used on web
   *  to render the dropdown via a portal at the right viewport position,
   *  flipping above the trigger if there isn't room below. */
  anchorRect?: AnchorRect | null;
  /** Arbitrary post data to surface in the dev-only JSON inspector. The
   *  caller usually passes the same `post` object it handed to PostCard;
   *  __DEV__ guards both the prop's consumption and the menu item itself
   *  so prod builds drop the whole branch. */
  debugData?: unknown;
  onDismiss: () => void;
  onTranslatePress: () => void;
};

const WEB_MENU_ESTIMATED_HEIGHT = 380;

// Global ref to dismiss any currently open menu when a new one opens
let activeMenuDismiss: (() => void) | null = null;

type MenuItemRowProps = {
  item: PostMenuItem;
  iconColor: string;
  hoverBg: string;
  onPress?: ((e: any) => void) | (() => void);
};

const DANGER_HOVER_BG = hexToRgba(semanticColors.danger, 0.12);

const MenuItemRow = React.memo(function MenuItemRow({
  item,
  iconColor,
  hoverBg,
  onPress,
}: MenuItemRowProps) {
  const [hovered, setHovered] = useState(false);
  const showHover = Platform.OS === 'web' && hovered && !item.disabled;
  const hoverColor = item.destructive ? DANGER_HOVER_BG : hoverBg;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        showHover && { backgroundColor: hoverColor },
        pressed && { opacity: item.disabled ? 1 : activeOpacity.default },
      ]}
      onPress={item.disabled ? undefined : onPress}
      onPointerEnter={Platform.OS === 'web' && !item.disabled ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled }}
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
    </Pressable>
  );
});

export const PostActionsMenu = React.memo(function PostActionsMenu({
  visible,
  canTranslate,
  postText,
  postUri,
  postCid,
  authorDid,
  feedUri,
  feedContext,
  anchorRect,
  debugData,
  onDismiss,
  onTranslatePress,
}: PostActionsMenuProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showControlsSheet, setShowControlsSheet] = useState(false);
  const [showDebugInspector, setShowDebugInspector] = useState(false);
  const dialogManager = useDialogManager();
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

  const menuBackgroundColor = useThemeColor({}, 'panel');
  const handleBarColor = useThemeColor({}, 'lineSoft');
  const iconColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const hoverBg = useThemeColor({}, 'hover');

  const muteMutation = useMuteUser();
  const muteThreadMutation = useMuteThread();
  const pinPostMutation = usePinPost();
  const feedInteractionMutation = useSendFeedInteraction();
  const { hidePost, hideAccount } = useHiddenContent();
  const isNotesContributor = useIsCommunityNotesContributor();

  // Algorithmic feed gens advertise their context via at:// URIs that
  // include `app.bsky.feed.generator`. The Following timeline (URI
  // `following`) and the user's own author feed don't, so we only
  // surface the show-more / show-less rows when we're inside one.
  const isAlgorithmicFeed = !!feedUri && feedUri.includes('app.bsky.feed.generator');
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
        return undefined;
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

  const handleShowMore = useCallback(() => {
    if (!feedUri || !postUri) return;
    feedInteractionMutation.mutate(
      {
        feedUri,
        postUri,
        event: 'app.bsky.feed.defs#interactionRequestMore',
        feedContext,
      },
      {
        onSuccess: () =>
          showToast({ message: t('post.actions.showMoreSent'), type: 'success' }),
      },
    );
    onDismiss();
  }, [feedUri, postUri, feedContext, feedInteractionMutation, onDismiss, showToast, t]);

  const handleShowLess = useCallback(() => {
    if (!feedUri || !postUri) return;
    feedInteractionMutation.mutate(
      {
        feedUri,
        postUri,
        event: 'app.bsky.feed.defs#interactionRequestLess',
        feedContext,
      },
      {
        onSuccess: () =>
          showToast({ message: t('post.actions.showLessSent'), type: 'success' }),
      },
    );
    onDismiss();
  }, [feedUri, postUri, feedContext, feedInteractionMutation, onDismiss, showToast, t]);

  const handleOpenAddNote = useCallback(() => {
    if (!postUri) return;
    const id = 'add-community-note';
    dialogManager.open({
      id,
      component: (
        <AddCommunityNoteModal
          onClose={() => dialogManager.close(id)}
          postUri={postUri}
        />
      ),
    });
  }, [dialogManager, postUri]);

  const handleOpenRequestNote = useCallback(() => {
    if (!postUri) return;
    const id = 'request-community-note';
    dialogManager.open({
      id,
      component: (
        <RequestCommunityNoteModal
          onClose={() => dialogManager.close(id)}
          postUri={postUri}
        />
      ),
    });
  }, [dialogManager, postUri]);

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
      );

      if (isAlgorithmicFeed) {
        items.push(
          { key: 'showMore', icon: 'hand.thumbsup', label: t('post.actions.showMore'), onPress: handleShowMore, disabled: !postUri },
          { key: 'showLess', icon: 'hand.thumbsdown', label: t('post.actions.showLess'), onPress: handleShowLess, disabled: !postUri },
        );
      }

      items.push(
        { key: 'muteThread', icon: 'bell.slash', label: t('post.actions.muteThread'), onPress: handleMuteThread, disabled: !postUri },
        { key: 'muteAccount', icon: 'speaker.slash', label: t('profile.muteAccount'), onPress: handleMuteAccount, disabled: !authorDid },
        { key: 'hidePost', icon: 'eye.slash', label: t('post.actions.hidePost'), onPress: handleHidePost, disabled: !postUri },
        { key: 'hideAccount', icon: 'person.crop.circle.badge.xmark', label: t('post.actions.hideAccount'), onPress: handleHideAccount, disabled: !authorDid },
        // Reader-side "request a note" — always available to anyone
        // (matches X's affordance: any user can flag, only enrolled
        // contributors can author).
        {
          key: 'requestCommunityNote',
          icon: 'questionmark.circle',
          label: t('post.actions.requestCommunityNote'),
          onPress: () => {
            onDismiss();
            handleOpenRequestNote();
          },
          disabled: !postUri,
        },
        // Contributor-side "add a note" — gated on the local opt-in
        // flag from the Community Notes portal. Non-enrolled accounts
        // don't see this entry at all; enrolling happens in the
        // sidebar's Community Notes page.
        ...(isNotesContributor
          ? [
              {
                key: 'addCommunityNote',
                icon: 'info.circle',
                label: t('post.actions.addCommunityNote'),
                onPress: () => {
                  onDismiss();
                  handleOpenAddNote();
                },
                disabled: !postUri,
              } as PostMenuItem,
            ]
          : []),
        { key: 'reportPost', icon: 'exclamationmark.triangle', label: t('profile.reportPost'), onPress: () => { onDismiss(); setShowReportSheet(true); }, destructive: true },
      );

      // Dev-only inspector. __DEV__ is a Metro/Babel compile-time constant,
      // so this whole branch tree-shakes out of production bundles.
      if (__DEV__) {
        items.push({
          key: 'inspectJson',
          icon: 'chevron.left.forwardslash.chevron.right',
          label: 'Inspect post JSON (dev)',
          onPress: () => {
            onDismiss();
            setShowDebugInspector(true);
          },
        });
      }

      return items;
    },
    [canTranslate, postText, authorDid, postUri, postCid, isOwnPost, isCurrentlyPinned, isAlgorithmicFeed, isNotesContributor, handleCopyText, handleMuteAccount, handleMuteThread, handleHidePost, handleHideAccount, handleShowMore, handleShowLess, handlePinPost, handleOpenAddNote, handleOpenRequestNote, onTranslatePress, onDismiss, t],
  );

  const wrapPress = Platform.OS === 'web'
    ? (handler: (() => void) | undefined) => (e: any) => { e?.stopPropagation?.(); e?.preventDefault?.(); handler?.(); }
    : (handler: (() => void) | undefined) => handler;

  const menuItems = menuActions.map((item) => (
    <MenuItemRow
      key={item.key}
      item={item}
      iconColor={iconColor}
      hoverBg={hoverBg}
      onPress={item.disabled ? undefined : wrapPress(item.onPress)}
    />
  ));

  return (
    <>
    {Platform.OS === 'web' ? (
      <WebPortalDropdown
        visible={visible}
        anchorRect={anchorRect}
        estimatedHeight={WEB_MENU_ESTIMATED_HEIGHT}
      >
        <ThemedView
          style={[styles.webDropdown, { backgroundColor: menuBackgroundColor, borderColor: handleBarColor }]}
        >
          {menuItems}
        </ThemedView>
      </WebPortalDropdown>
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
                  <Pressable
                    style={({ pressed }) => [styles.sheetItem, item.disabled && styles.menuItemDisabled, pressed && { opacity: item.disabled ? 1 : activeOpacity.default }]}
                    onPress={item.disabled ? undefined : item.onPress}
                    disabled={item.disabled}
                    accessibilityRole="menuitem"
                    accessibilityState={{ disabled: item.disabled }}
                    
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
                  </Pressable>
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
    {__DEV__ ? (
      <PostDebugInspector
        visible={showDebugInspector}
        postUri={postUri}
        postCid={postCid}
        data={debugData}
        onDismiss={() => setShowDebugInspector(false)}
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
    paddingLeft: spacing.md,
    paddingRight: spacing.xl,
    borderRadius: radius.sm,
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
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    // boxShadow is a web-only style; RN-web passes it through to CSS.
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  } as ViewStyle,
});
