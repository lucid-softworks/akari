import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ListPickerSheet } from '@/components/ListPickerSheet';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import {
  AddCommunityNoteModal,
  RequestCommunityNoteModal,
} from '@/components/post/CommunityNoteContributor';
import { PostDebugInspector } from '@/components/post/PostDebugInspector';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Menu, MenuTrigger, type MenuItem } from '@/components/ui/Menu';
import { ReportSheet } from '@/components/ReportSheet';
import { hexToRgba, hitSlop, radius, spacing } from '@/constants/tokens';
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

type PostActionsMenuProps = {
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
  /** Arbitrary post data to surface in the dev-only JSON inspector. The
   *  caller usually passes the same `post` object it handed to PostCard;
   *  __DEV__ guards both the prop's consumption and the menu item itself
   *  so prod builds drop the whole branch. */
  debugData?: unknown;
  onTranslatePress: () => void;
  /** Optional style override applied to the `…` trigger button. */
  triggerStyle?: StyleProp<ViewStyle>;
  /** Accessibility label for the trigger. */
  triggerAccessibilityLabel: string;
};

/**
 * The post `…` overflow menu. Owns its own trigger, the Menu portal, and
 * every sub-modal it can open (report, list picker, post controls, debug
 * inspector, community-note flows). Drop it next to the other post-action
 * buttons and it takes care of the rest.
 */
export const PostActionsMenu = React.memo(function PostActionsMenu({
  canTranslate,
  postText,
  postUri,
  postCid,
  authorDid,
  feedUri,
  feedContext,
  debugData,
  onTranslatePress,
  triggerStyle,
  triggerAccessibilityLabel,
}: PostActionsMenuProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
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

  const restingColor = useThemeColor({}, 'textTertiary');

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
  }, [postUri, postCid, isCurrentlyPinned, pinPostMutation, showToast, t]);

  const handleCopyText = useCallback(() => {
    if (!postText) return;
    void Clipboard.setStringAsync(postText).then(() => {
      showToast({ message: t('common.copiedToClipboard'), type: 'success' });
      return undefined;
    });
  }, [postText, showToast, t]);

  const handleMuteAccount = useCallback(() => {
    if (authorDid) {
      muteMutation.mutate({ actor: authorDid, action: 'mute' });
    }
  }, [authorDid, muteMutation]);

  const handleMuteThread = useCallback(() => {
    if (!postUri) return;
    muteThreadMutation.mutate(
      { root: postUri, action: 'mute' },
      {
        onSuccess: () => showToast({ message: t('post.actions.threadMuted'), type: 'success' }),
        onError: () => showToast({ message: t('common.somethingWentWrong'), type: 'error' }),
      },
    );
  }, [postUri, muteThreadMutation, showToast, t]);

  const handleHidePost = useCallback(() => {
    if (postUri) {
      hidePost(postUri);
      showToast({ message: t('post.actions.postHidden'), type: 'success' });
    }
  }, [postUri, hidePost, showToast, t]);

  const handleHideAccount = useCallback(() => {
    if (authorDid) {
      hideAccount(authorDid);
      showToast({ message: t('post.actions.accountHidden'), type: 'success' });
    }
  }, [authorDid, hideAccount, showToast, t]);

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
        onSuccess: () => showToast({ message: t('post.actions.showMoreSent'), type: 'success' }),
      },
    );
  }, [feedUri, postUri, feedContext, feedInteractionMutation, showToast, t]);

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
        onSuccess: () => showToast({ message: t('post.actions.showLessSent'), type: 'success' }),
      },
    );
  }, [feedUri, postUri, feedContext, feedInteractionMutation, showToast, t]);

  const handleOpenAddNote = useCallback(() => {
    if (!postUri) return;
    const id = 'add-community-note';
    dialogManager.open({
      id,
      component: <AddCommunityNoteModal onClose={() => dialogManager.close(id)} postUri={postUri} />,
    });
  }, [dialogManager, postUri]);

  const handleOpenRequestNote = useCallback(() => {
    if (!postUri) return;
    const id = 'request-community-note';
    dialogManager.open({
      id,
      component: <RequestCommunityNoteModal onClose={() => dialogManager.close(id)} postUri={postUri} />,
    });
  }, [dialogManager, postUri]);

  const items = useMemo<MenuItem[]>(() => {
    const list: MenuItem[] = [
      {
        key: 'translate',
        icon: 'character.book.closed',
        label: t('post.actions.translate'),
        onPress: onTranslatePress,
        disabled: !canTranslate,
      },
      {
        key: 'copyText',
        icon: 'doc.on.doc',
        label: t('post.actions.copyText'),
        onPress: handleCopyText,
        disabled: !postText,
      },
    ];

    if (isOwnPost) {
      list.push({
        key: 'pinPost',
        icon: isCurrentlyPinned ? 'pin.slash' : 'pin',
        label: isCurrentlyPinned ? t('post.unpinFromProfile') : t('post.pinToProfile'),
        onPress: handlePinPost,
        disabled: !postUri || !postCid,
      });
      list.push({
        key: 'editControls',
        icon: 'bubble.left.and.bubble.right',
        label: t('post.controls.edit'),
        onPress: () => setShowControlsSheet(true),
        disabled: !postUri,
      });
    }

    list.push({
      key: 'addToLists',
      icon: 'list.bullet',
      label: t('profile.addToLists'),
      onPress: () => setShowListPicker(true),
      disabled: !authorDid,
    });

    if (isAlgorithmicFeed) {
      list.push(
        { key: 'showMore', icon: 'hand.thumbsup', label: t('post.actions.showMore'), onPress: handleShowMore, disabled: !postUri },
        { key: 'showLess', icon: 'hand.thumbsdown', label: t('post.actions.showLess'), onPress: handleShowLess, disabled: !postUri },
      );
    }

    list.push(
      { key: 'muteThread', icon: 'bell.slash', label: t('post.actions.muteThread'), onPress: handleMuteThread, disabled: !postUri },
      { key: 'muteAccount', icon: 'speaker.slash', label: t('profile.muteAccount'), onPress: handleMuteAccount, disabled: !authorDid },
      { key: 'hidePost', icon: 'eye.slash', label: t('post.actions.hidePost'), onPress: handleHidePost, disabled: !postUri },
      { key: 'hideAccount', icon: 'person.crop.circle.badge.xmark', label: t('post.actions.hideAccount'), onPress: handleHideAccount, disabled: !authorDid },
      // Reader-side "request a note" — always available to anyone (matches
      // X's affordance: any user can flag, only enrolled contributors can
      // author).
      {
        key: 'requestCommunityNote',
        icon: 'questionmark.circle',
        label: t('post.actions.requestCommunityNote'),
        onPress: handleOpenRequestNote,
        disabled: !postUri,
      },
    );

    // Contributor-side "add a note" — gated on the local opt-in flag from
    // the Community Notes portal. Non-enrolled accounts don't see this entry
    // at all; enrolling happens in the sidebar's Community Notes page.
    if (isNotesContributor) {
      list.push({
        key: 'addCommunityNote',
        icon: 'info.circle',
        label: t('post.actions.addCommunityNote'),
        onPress: handleOpenAddNote,
        disabled: !postUri,
      });
    }

    list.push({
      key: 'reportPost',
      icon: 'exclamationmark.triangle',
      label: t('profile.reportPost'),
      destructive: true,
      onPress: () => setShowReportSheet(true),
    });

    // Dev-only inspector. __DEV__ is a Metro/Babel compile-time constant,
    // so this whole branch tree-shakes out of production bundles.
    if (__DEV__) {
      list.push({
        key: 'inspectJson',
        icon: 'chevron.left.forwardslash.chevron.right',
        label: 'Inspect post JSON (dev)',
        onPress: () => setShowDebugInspector(true),
      });
    }

    return list;
  }, [
    t,
    canTranslate,
    postText,
    postUri,
    postCid,
    authorDid,
    isOwnPost,
    isCurrentlyPinned,
    isAlgorithmicFeed,
    isNotesContributor,
    onTranslatePress,
    handleCopyText,
    handlePinPost,
    handleShowMore,
    handleShowLess,
    handleMuteThread,
    handleMuteAccount,
    handleHidePost,
    handleHideAccount,
    handleOpenRequestNote,
    handleOpenAddNote,
  ]);

  return (
    <>
      <Menu items={items}>
        <MenuTrigger
          accessibilityLabel={triggerAccessibilityLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.trigger,
            triggerStyle,
            pressed && { backgroundColor: hexToRgba(restingColor, 0.1) },
          ]}
        >
          <IconSymbol name="ellipsis" size={20} color={restingColor} />
        </MenuTrigger>
      </Menu>

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
                onSuccess: () => showToast({ message: t('post.controls.updated'), type: 'success' }),
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
});

// Re-export for callers that previously imported the type.
export type { PostActionsMenuProps };
