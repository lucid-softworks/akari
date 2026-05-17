import { Linking } from 'react-native';

import { useToast } from '@/contexts/ToastContext';
import { useCreateLeaflet } from '@/hooks/mutations/useCreateLeaflet';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useTranslation } from '@/hooks/useTranslation';
import type { PostControls } from '@/utils/postControls';
import {
  EMPTY_THREAD_POST,
  MAX_POST_CHARACTERS,
  type ComposeMode,
  type QuotedPost,
  type ThreadPost,
} from '@/utils/postComposer/types';
import { splitForThread } from '@/utils/threadSplitter';

type ReplyContext = {
  root: string;
  parent: string;
  authorHandle: string;
};

type UseComposerPublishOptions = {
  composeMode: ComposeMode;
  posts: ThreadPost[];
  longText: string;
  longTitle: string;
  postLangs: string[];
  postControls: PostControls;
  replyTo?: ReplyContext;
  quote?: QuotedPost;
  currentDraftId: string | null;
  deleteDraft: (id: string) => void;
  onResetAfterPublish: () => void;
  onClose: () => void;
};

type UseComposerPublishResult = {
  handlePublish: () => Promise<void>;
  isPosting: boolean;
  isPublishingLongform: boolean;
};

export function useComposerPublish({
  composeMode,
  posts,
  longText,
  longTitle,
  postLangs,
  postControls,
  replyTo,
  quote,
  currentDraftId,
  deleteDraft,
  onResetAfterPublish,
  onClose,
}: UseComposerPublishOptions): UseComposerPublishResult {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const createPostMutation = useCreatePost();
  const createLeafletMutation = useCreateLeaflet();
  const postControlsMutation = usePostControls();

  const handlePublish = async () => {
    // Long-form: publish a `pub.leaflet.document` to the user's PDS.
    if (composeMode === 'longform') {
      const title = longTitle.trim();
      const body = longText.trim();
      if (title.length === 0 || body.length === 0) return;
      try {
        const result = await createLeafletMutation.mutateAsync({ title, body });
        showToast({
          type: 'success',
          message: t('post.longform.publishedToast'),
        });
        Linking.openURL(result.url).catch(() => {
          /* document already published; in-app web may reject opens */
        });
      } catch (err) {
        if (__DEV__) console.warn('Failed to publish leaflet', err);
        showToast({
          type: 'error',
          title: t('post.longform.publishButton'),
          message: t('post.longform.publishFailed'),
        });
        return;
      }
      if (currentDraftId) deleteDraft(currentDraftId);
      onResetAfterPublish();
      onClose();
      return;
    }

    // Auto-thread or standard: build the thread list, then chain posts.
    const trimmed = (() => {
      if (composeMode === 'autothread') {
        const chunks = splitForThread(longText, MAX_POST_CHARACTERS);
        const media = posts[0] ?? EMPTY_THREAD_POST;
        if (chunks.length === 0) {
          if (media.attachedImages.length > 0 || media.attachedVideo) {
            return [{ ...media, text: '' }];
          }
          return [];
        }
        return chunks.map<ThreadPost>((chunkText, i) =>
          i === 0
            ? {
                text: chunkText,
                attachedImages: media.attachedImages,
                attachedVideo: media.attachedVideo,
              }
            : { text: chunkText, attachedImages: [], attachedVideo: null },
        );
      }
      const out = posts.slice();
      while (
        out.length > 1 &&
        out[out.length - 1].text.trim().length === 0 &&
        out[out.length - 1].attachedImages.length === 0
      ) {
        out.pop();
      }
      return out;
    })();
    if (trimmed.length === 0) return;
    const rootPost = trimmed[0];
    const rootPostHasContent =
      rootPost.text.trim().length > 0 ||
      rootPost.attachedImages.length > 0 ||
      !!rootPost.attachedVideo ||
      !!quote;
    if (!rootPostHasContent) return;

    try {
      const conversationRoot = replyTo?.root;
      let our0Uri: string | undefined;
      let prevUri: string | undefined;

      for (let i = 0; i < trimmed.length; i++) {
        const p = trimmed[i];
        const isRoot = i === 0;
        let replyContext: { root: string; parent: string } | undefined;
        if (isRoot && replyTo) {
          replyContext = { root: replyTo.root, parent: replyTo.parent };
        } else if (!isRoot) {
          const rootForReply = conversationRoot ?? our0Uri;
          if (rootForReply && prevUri) {
            replyContext = { root: rootForReply, parent: prevUri };
          }
        }

        const created = await createPostMutation.mutateAsync({
          text: p.text.trim(),
          replyTo: replyContext,
          images:
            !p.attachedVideo && p.attachedImages.length > 0
              ? p.attachedImages
              : undefined,
          video: p.attachedVideo?.blob
            ? {
                blob: p.attachedVideo.blob,
                alt: p.attachedVideo.alt || undefined,
                aspectRatio: p.attachedVideo.aspectRatio,
              }
            : undefined,
          quote: isRoot && quote ? { uri: quote.uri, cid: quote.cid } : undefined,
          langs: postLangs,
        });

        if (isRoot) {
          our0Uri = created?.uri;
          if (created?.uri) {
            postControlsMutation
              .mutateAsync({ postUri: created.uri, controls: postControls })
              .catch((err) => {
                if (__DEV__) console.warn('Failed to set post controls', err);
              });
          }
        }
        prevUri = created?.uri;
      }

      if (currentDraftId) deleteDraft(currentDraftId);
      onResetAfterPublish();
      onClose();
    } catch (error) {
      console.error('Failed to create thread:', error);
      showToast({
        type: 'error',
        title: t('post.post'),
        message: t('common.error'),
      });
    }
  };

  return {
    handlePublish,
    isPosting: createPostMutation.isPending,
    isPublishingLongform: createLeafletMutation.isPending,
  };
}
