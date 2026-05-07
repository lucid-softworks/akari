import { Image } from '@/components/Image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createUploadTask,
  FileSystemUploadType,
} from 'expo-file-system/legacy';

import { getVideoJobStatus, type BlueskyEmbed, type VideoJobStatus } from '@/bluesky-api';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { DraftsSheet } from '@/components/DraftsSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GifPicker } from '@/components/GifPicker';
import { PostControlsSheet } from '@/components/PostControlsSheet';
import { PostLanguagesSheet } from '@/components/PostLanguagesSheet';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, layout, shadows } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import {
  useCreateDraft,
  useDeleteDraft,
  useUpdateDraft,
} from '@/hooks/mutations/useDraftMutations';
import { usePostControls } from '@/hooks/mutations/usePostControls';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useDrafts } from '@/hooks/queries/useDrafts';
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings';
import { usePostLanguages } from '@/hooks/usePostLanguages';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLanguageLabel } from '@/utils/bcp47';
import type { ComposerDraftState } from '@/utils/draftMapper';
import { DEFAULT_POST_CONTROLS, describePostControls, type PostControls } from '@/utils/postControls';
import { apiForAccount } from '@/utils/blueskyApi';

type PostFacet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; tag?: string; did?: string }[];
};

type PostPreview = {
  text?: string;
  author: {
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  embed?: BlueskyEmbed;
  embeds?: BlueskyEmbed[];
  facets?: PostFacet[];
};

type QuotedPost = PostPreview & {
  uri: string;
  cid: string;
  indexedAt?: string;
};

type QuotedImage = { url: string; aspectRatio?: number };

function extractQuotedMedia(quote?: QuotedPost): {
  images: QuotedImage[];
  video: { thumb: string; aspectRatio?: number } | null;
  external: { thumb: string } | null;
} {
  if (!quote) {
    return { images: [], video: null, external: null };
  }

  const candidates: (BlueskyEmbed | undefined)[] = [
    quote.embed,
    ...(quote.embeds ?? []),
  ];

  const images: QuotedImage[] = [];
  let video: { thumb: string; aspectRatio?: number } | null = null;
  let external: { thumb: string } | null = null;

  const ratioFrom = (ar?: { width: number; height: number }) =>
    ar && ar.width > 0 && ar.height > 0 ? ar.width / ar.height : undefined;

  const visit = (embed?: BlueskyEmbed | null) => {
    if (!embed) return;

    if (
      (embed.$type === 'app.bsky.embed.images#view' || embed.$type === 'app.bsky.embed.images') &&
      embed.images
    ) {
      for (const img of embed.images) {
        const url = img.thumb || img.fullsize;
        const isVideoFile = img.image?.mimeType?.startsWith('video/');
        if (url && !isVideoFile && images.length < 4) {
          images.push({ url, aspectRatio: ratioFrom(img.aspectRatio) });
        }
      }
    }

    if (embed.$type === 'app.bsky.embed.video#view' && (embed.thumbnail || embed.playlist)) {
      const thumb = embed.thumbnail;
      if (thumb && !video) {
        video = { thumb, aspectRatio: ratioFrom(embed.aspectRatio) };
      }
    }

    if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.thumb?.ref?.$link) {
      external = { thumb: embed.external.thumb.ref.$link };
    }

    // recordWithMedia: descend into media
    if (embed.media) visit(embed.media as unknown as BlueskyEmbed);
  };

  for (const c of candidates) visit(c);

  return { images, video, external };
}

type PostComposerProps = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
    /** Optional preview data — renders the parent post above the input. */
    preview?: PostPreview;
  };
  /** Optional quoted post — renders an inline preview and includes
   * `embed.record` (or `embed.recordWithMedia` if images are attached)
   * when the post is published. */
  quote?: QuotedPost;
};

type AttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

type AttachedVideo = {
  uri: string;
  mimeType: string;
  alt: string;
  aspectRatio?: { width: number; height: number };
  /** Set once the transcode pipeline finishes. The post button stays
   *  disabled until this lands. */
  blob?: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
  /** UI state during upload + transcode. `phase` drives the progress
   *  row's label / spinner. */
  upload?:
    | { phase: 'authorizing' }
    | { phase: 'uploading'; progress: number }
    | { phase: 'processing'; progress?: number }
    | { phase: 'error'; message: string };
};

/** One leaf in a thread compose. The composer holds an array of these
 *  and posts them sequentially with reply chaining when published. */
type ThreadPost = {
  text: string;
  attachedImages: AttachedImage[];
  attachedVideo: AttachedVideo | null;
};

const EMPTY_THREAD_POST: ThreadPost = {
  text: '',
  attachedImages: [],
  attachedVideo: null,
};

const isWeb = Platform.OS === 'web';
const nativePresentationStyle: 'pageSheet' | 'fullScreen' | undefined =
  Platform.OS === 'ios' ? 'pageSheet' : Platform.OS === 'android' ? 'fullScreen' : undefined;

export function PostComposer({ visible, onClose, replyTo, quote }: PostComposerProps) {
  const { t } = useTranslation();
  // Thread of posts to publish. Length 1 = standard single-post compose;
  // length > 1 = multi-post thread. activeIndex tracks which post is
  // focused (so footer actions like the emoji picker / image picker
  // target the right entry).
  const [posts, setPosts] = useState<ThreadPost[]>([{ ...EMPTY_THREAD_POST }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [controlsSheetVisible, setControlsSheetVisible] = useState(false);
  const [postControls, setPostControls] = useState<PostControls>(DEFAULT_POST_CONTROLS);
  const [textSelection, setTextSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const activePost = posts[activeIndex] ?? EMPTY_THREAD_POST;
  const text = activePost.text;
  const attachedImages = activePost.attachedImages;
  const attachedVideo = activePost.attachedVideo;

  const setText = useCallback(
    (next: string) => {
      setPosts((prev) =>
        prev.map((p, i) => (i === activeIndex ? { ...p, text: next } : p)),
      );
    },
    [activeIndex],
  );

  const setAttachedImages = useCallback(
    (next: AttachedImage[]) => {
      setPosts((prev) =>
        prev.map((p, i) => (i === activeIndex ? { ...p, attachedImages: next } : p)),
      );
    },
    [activeIndex],
  );

  const setAttachedVideo = useCallback(
    (next: AttachedVideo | null) => {
      setPosts((prev) =>
        prev.map((p, i) => (i === activeIndex ? { ...p, attachedVideo: next } : p)),
      );
    },
    [activeIndex],
  );

  const addPost = useCallback(() => {
    setPosts((prev) => [...prev, { ...EMPTY_THREAD_POST }]);
    // Focus moves to the new (last) post.
    setActiveIndex((prev) => prev + 1);
    setTextSelection({ start: 0, end: 0 });
  }, []);

  const removePost = useCallback((index: number) => {
    setPosts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveIndex((prev) => (index <= prev ? Math.max(0, prev - 1) : prev));
  }, []);
  const createPostMutation = useCreatePost();
  const postControlsMutation = usePostControls();
  const { showToast } = useToast();
  const { bottom, top } = useSafeAreaInsets();
  const { data: currentAccount } = useCurrentAccount();
  const { data: jwtToken } = useJwtToken();
  const did = currentAccount?.did;

  // Per-post BCP-47 language tags. Persists across composer opens via
  // `usePostLanguages` (defaults to the user's UI locale on first run).
  const { langs: postLangs, setLangs: setPostLangs } = usePostLanguages();
  const [languagesSheetVisible, setLanguagesSheetVisible] = useState(false);
  const { currentLocale } = useLanguage();
  const postLangsLabel = postLangs
    .map((tag) => getLanguageLabel(tag, currentLocale))
    .join(', ');

  // Drafts only apply to plain new posts — re-opening a stale reply/quote
  // composer with mismatched context is more confusing than helpful.
  const draftsApply = !replyTo && !quote;

  // Server-side drafts via app.bsky.draft.*. Only fetched when the
  // composer is visible and we're in plain-post mode.
  const draftsQuery = useDrafts(visible && draftsApply);
  const drafts = draftsQuery.data ?? [];
  const createDraftMutation = useCreateDraft();
  const updateDraftMutation = useUpdateDraft();
  const deleteDraftMutation = useDeleteDraft();

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftsSheetVisible, setDraftsSheetVisible] = useState(false);

  // Mirror the id into a ref so the async save loop never reads stale state.
  const draftIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  // Single-flight drain loop. New saves overwrite `pendingPayloadRef`;
  // `savePromiseRef` holds the active drain so concurrent callers can
  // await the same completion (the autosave timer kicks one off, the
  // close-alert "Save draft" button needs to wait for it).
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const pendingPayloadRef = useRef<{
    posts: ThreadPost[];
    controls: PostControls;
  } | null>(null);
  const hydratedRef = useRef(false);

  // Reset state on each open cycle. We do NOT auto-load any draft — the
  // user picks one explicitly via the drafts pill.
  useEffect(() => {
    if (!visible) {
      hydratedRef.current = false;
      pendingPayloadRef.current = null;
      return;
    }
    setCurrentDraftId(null);
    draftIdRef.current = null;
    pendingPayloadRef.current = null;
    setPosts([{ ...EMPTY_THREAD_POST }]);
    setActiveIndex(0);
    hydratedRef.current = true;
  }, [visible]);

  // The `mutate*` methods on react-query mutations are stable across
  // renders, but the surrounding result objects are not — pulling them
  // into useCallback deps would invalidate the callback on every
  // mutation state transition. We keep references to the stable methods
  // in refs so `runSave` itself can stay stable.
  const createMutateRef = useRef(createDraftMutation.mutateAsync);
  const updateMutateRef = useRef(updateDraftMutation.mutateAsync);
  const deleteMutateRef = useRef(deleteDraftMutation.mutateAsync);
  useEffect(() => {
    createMutateRef.current = createDraftMutation.mutateAsync;
    updateMutateRef.current = updateDraftMutation.mutateAsync;
    deleteMutateRef.current = deleteDraftMutation.mutateAsync;
  });

  const runSave = useCallback(
    (payload: {
      posts: ThreadPost[];
      controls: PostControls;
    }): Promise<void> => {
      pendingPayloadRef.current = payload;
      // If a drain is already running, the loop will pick up our payload
      // on its next iteration. Returning that promise lets the caller
      // await full completion — important for the close-alert "Save
      // draft" path, which must finish before resetAndClose() clears
      // `draftIdRef.current`.
      if (savePromiseRef.current) return savePromiseRef.current;
      const drain = (async () => {
        // Yield once so the outer `savePromiseRef.current = drain`
        // assignment lands BEFORE the finally below runs. Without this,
        // a synchronous-only path through the loop (e.g. an empty
        // payload with no draft id, which `continue`s and exits) would
        // null savePromiseRef inside the IIFE, then the outer code
        // would re-assign it to a now-resolved promise — leaving a
        // stale reference that blocks every subsequent save.
        await Promise.resolve();
        try {
          while (pendingPayloadRef.current) {
            const next = pendingPayloadRef.current;
            pendingPayloadRef.current = null;
            // Reshape thread posts → draft entries; trim trailing empties.
            const trimmed = next.posts.slice();
            while (
              trimmed.length > 1 &&
              trimmed[trimmed.length - 1].text.trim().length === 0 &&
              trimmed[trimmed.length - 1].attachedImages.length === 0
            ) {
              trimmed.pop();
            }
            const isEmpty =
              trimmed.length === 0 ||
              (trimmed.length === 1 &&
                trimmed[0].text.trim().length === 0 &&
                trimmed[0].attachedImages.length === 0);
            const draftPosts = trimmed.map((p) => ({
              text: p.text,
              images: p.attachedImages,
            }));
            try {
              if (isEmpty) {
                if (!draftIdRef.current) continue;
                const id = draftIdRef.current;
                draftIdRef.current = null;
                setCurrentDraftId(null);
                await deleteMutateRef.current({ id });
              } else if (draftIdRef.current) {
                await updateMutateRef.current({
                  id: draftIdRef.current,
                  posts: draftPosts,
                  controls: next.controls,
                });
              } else {
                const created = await createMutateRef.current({
                  posts: draftPosts,
                  controls: next.controls,
                });
                draftIdRef.current = created.id;
                setCurrentDraftId(created.id);
              }
            } catch (err) {
              const code = (err as { errorCode?: string } | null)?.errorCode;
              if (code === 'DraftLimitReached') {
                showToast({
                  type: 'error',
                  message: t('post.draft.limitReached'),
                });
                // Stop draining — the user needs to delete one before retrying.
                pendingPayloadRef.current = null;
                break;
              }
              if (__DEV__) console.warn('Draft save failed', err);
            }
          }
        } finally {
          savePromiseRef.current = null;
        }
      })();
      savePromiseRef.current = drain;
      return drain;
    },
    [showToast, t],
  );

  // Debounced autosave on form changes. We ONLY autosave drafts that
  // the user explicitly opened from the drafts sheet — fresh composes
  // never auto-create a draft. The user must tap "Save draft" via the
  // close alert to persist a new draft. This prevents a brand-new
  // session from ever silently overwriting (or replacing) an unrelated
  // existing draft.
  useEffect(() => {
    if (!visible || !draftsApply || !did || !hydratedRef.current) return;
    if (!currentDraftId) return;
    const timeout = setTimeout(() => {
      runSave({ posts, controls: postControls });
    }, 800);
    return () => clearTimeout(timeout);
  }, [visible, draftsApply, did, currentDraftId, posts, postControls, runSave]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const handlePost = async () => {
    // Trim trailing empty posts the user added but didn't fill in.
    const trimmed = (() => {
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
    const root = trimmed[0];
    const rootHasContent =
      root.text.trim().length > 0 ||
      root.attachedImages.length > 0 ||
      !!root.attachedVideo ||
      !!quote;
    if (!rootHasContent) return;

    try {
      // For replies, the conversation root is the upstream post. For
      // standalone threads, the root is the URI of post #0 (which we
      // learn after the first createPost resolves).
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
          // Video and images are mutually exclusive at the lexicon
          // level — a post is one OR the other, not both.
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
          // Threadgate / postgate apply only to the root of OUR thread.
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

      // Drop the in-progress draft now that the thread is up.
      if (draftsApply && currentDraftId) {
        deleteDraftMutation.mutate({ id: currentDraftId });
      }

      // Reset form and close
      setPosts([{ ...EMPTY_THREAD_POST }]);
      setActiveIndex(0);
      setPostControls(DEFAULT_POST_CONTROLS);
      setCurrentDraftId(null);
      draftIdRef.current = null;
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

  const resetAndClose = useCallback(() => {
    setPosts([{ ...EMPTY_THREAD_POST }]);
    setActiveIndex(0);
    setPostControls(DEFAULT_POST_CONTROLS);
    setCurrentDraftId(null);
    draftIdRef.current = null;
    setGifPickerVisible(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    const hasContent = posts.some(
      (p) =>
        p.text.trim().length > 0 ||
        p.attachedImages.length > 0 ||
        !!p.attachedVideo,
    );
    if (draftsApply && did && hasContent) {
      Alert.alert(t('post.draft.discardTitle'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('post.draft.discard'),
          style: 'destructive',
          onPress: () => {
            if (currentDraftId) deleteDraftMutation.mutate({ id: currentDraftId });
            resetAndClose();
          },
        },
        {
          text: t('post.draft.saveDraft'),
          onPress: async () => {
            // Flush any pending debounce so the latest content lands on the
            // server before we close. runSave serializes against any
            // already-running save.
            await runSave({ posts, controls: postControls });
            showToast({ type: 'success', message: t('post.draft.savedToast') });
            resetAndClose();
          },
        },
      ]);
      return;
    }
    resetAndClose();
  }, [
    draftsApply,
    did,
    posts,
    postControls,
    currentDraftId,
    deleteDraftMutation,
    runSave,
    t,
    showToast,
    resetAndClose,
  ]);

  const handleSelectDraft = useCallback((draft: ComposerDraftState) => {
    setPosts(
      draft.posts.length > 0
        ? draft.posts.map((p) => ({
            text: p.text,
            attachedImages: p.images,
            attachedVideo: null,
          }))
        : [{ ...EMPTY_THREAD_POST }],
    );
    setActiveIndex(0);
    setPostControls(draft.controls);
    setCurrentDraftId(draft.id);
    draftIdRef.current = draft.id;
    setDraftsSheetVisible(false);
  }, []);

  const handleDeleteDraft = useCallback(
    (draft: ComposerDraftState) => {
      deleteDraftMutation.mutate({ id: draft.id });
      if (currentDraftId === draft.id) {
        setCurrentDraftId(null);
        draftIdRef.current = null;
      }
    },
    [deleteDraftMutation, currentDraftId],
  );

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        alt: '',
        mimeType: asset.mimeType || 'image/jpeg',
      }));

      const totalImages = attachedImages.length + newImages.length;
      if (totalImages <= 4) {
        setAttachedImages([...attachedImages, ...newImages]);
      } else {
        const remainingSlots = 4 - attachedImages.length;
        setAttachedImages([...attachedImages, ...newImages.slice(0, remainingSlots)]);
      }
    }
  };

  const updateVideoOnPost = useCallback(
    (postIdx: number, patch: Partial<AttachedVideo> | null) => {
      setPosts((prev) =>
        prev.map((p, i) => {
          if (i !== postIdx) return p;
          if (patch === null) return { ...p, attachedVideo: null };
          if (!p.attachedVideo) return p;
          return { ...p, attachedVideo: { ...p.attachedVideo, ...patch } };
        }),
      );
    },
    [],
  );

  const startVideoUpload = useCallback(
    async (
      postIdx: number,
      asset: { uri: string; mimeType: string },
    ) => {
      if (!jwtToken || !currentAccount?.did || !currentAccount?.pdsUrl) return;
      setPosts((prev) =>
        prev.map((p, i) =>
          i === postIdx && p.attachedVideo
            ? {
                ...p,
                attachedVideo: { ...p.attachedVideo, upload: { phase: 'authorizing' } },
              }
            : p,
        ),
      );
      try {
        const api = apiForAccount(currentAccount);
        // The video service expects the JWT's audience to be the
        // user's PDS DID (did:web:<pds-hostname>) and the lxm to be
        // `com.atproto.repo.uploadBlob` — *not* the obvious
        // `app.bsky.video.uploadVideo` lxm. That uses the PDS-issued
        // service-auth as a stand-in for an uploadBlob credential
        // (the video service stores the resulting blob on the PDS).
        const pdsHostMatch = currentAccount.pdsUrl.match(/^https?:\/\/([^\/?#]+)/i);
        const pdsHost = pdsHostMatch?.[1];
        if (!pdsHost) throw new Error('Invalid PDS URL');
        const auth = await api.getServiceAuth(
          jwtToken,
          `did:web:${pdsHost}`,
          'com.atproto.repo.uploadBlob',
          30 * 60, // 30 minutes — matches the official client.
        );
        const serviceJwt = auth?.token;
        if (!serviceJwt) {
          throw new Error("PDS didn't return a video service token");
        }

        // The video service dedupes by `did + name`. Reusing the same
        // filename triggers a 409 `already_exists` even when the bytes
        // are identical (it doesn't hand back the previous blob, so
        // we can't reuse it). Keep the original extension but stamp
        // each attempt with a random + timestamped slug so retries
        // don't collide.
        const ext =
          asset.uri.split('/').pop()?.split('?')[0]?.split('.').pop() || 'mp4';
        const fileName = `akari-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}.${ext}`;

        updateVideoOnPost(postIdx, { upload: { phase: 'uploading', progress: 0 } });

        // expo-file-system's createUploadTask streams the file from
        // disk and reports progress reliably — RN's XHR upload events
        // are flaky on iOS for blob bodies which is why our previous
        // attempt sat at 0%.
        const uploadUrl =
          `https://video.bsky.app/xrpc/app.bsky.video.uploadVideo` +
          `?did=${encodeURIComponent(currentAccount.did)}` +
          `&name=${encodeURIComponent(fileName)}`;
        const uploadTask = createUploadTask(
          uploadUrl,
          asset.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'Content-Type': asset.mimeType,
              Authorization: `Bearer ${serviceJwt}`,
            },
          },
          (p) => {
            if (p.totalBytesExpectedToSend > 0) {
              updateVideoOnPost(postIdx, {
                upload: {
                  phase: 'uploading',
                  progress: p.totalBytesSent / p.totalBytesExpectedToSend,
                },
              });
            }
          },
        );
        const uploadRes = await uploadTask.uploadAsync();
        if (__DEV__) {
          console.warn(
            'Video upload response',
            uploadRes?.status,
            uploadRes?.body,
          );
        }
        const isOk =
          uploadRes && uploadRes.status >= 200 && uploadRes.status < 300;
        const parsedJsonBody = (() => {
          try {
            return uploadRes?.body ? JSON.parse(uploadRes.body) : null;
          } catch {
            return null;
          }
        })();
        // The 409 "already_exists" response sometimes contains the
        // previous jobId at one of these locations; if it does we can
        // skip straight to polling. If it doesn't, no recovery — the
        // server gave us a hash collision with no handle on the
        // existing blob.
        const existingJobId =
          parsedJsonBody?.jobId ||
          parsedJsonBody?.jobStatus?.jobId ||
          parsedJsonBody?.id;
        const isAlreadyProcessed =
          uploadRes?.status === 409 && existingJobId;
        if (!isOk && !isAlreadyProcessed) {
          const detail = uploadRes?.body || `status ${uploadRes?.status ?? 'unknown'}`;
          throw new Error(`upload ${uploadRes?.status}: ${detail}`);
        }
        let job: VideoJobStatus =
          parsedJsonBody?.jobStatus ?? (parsedJsonBody as VideoJobStatus);
        // The dedupe response carries `state: COMPLETED` and a jobId
        // but omits the blob ref. Hit getJobStatus once with the
        // returned jobId to pull the actual blob in — without this
        // step the poll loop exits immediately and we error out on
        // "no blob" even though the server has one.
        if (isAlreadyProcessed && !job.blob && existingJobId) {
          const refreshed = await getVideoJobStatus(serviceJwt, existingJobId);
          job = refreshed.jobStatus;
        }
        updateVideoOnPost(postIdx, {
          upload: {
            phase: 'processing',
            progress: job.progress ? job.progress / 100 : undefined,
          },
        });

        const startedAt = Date.now();
        while (job.state !== 'JOB_STATE_COMPLETED' && job.state !== 'JOB_STATE_FAILED') {
          if (Date.now() - startedAt > 3 * 60 * 1000) {
            throw new Error('Video transcode timed out');
          }
          await new Promise<void>((r) => setTimeout(r, 1500));
          const next = await getVideoJobStatus(serviceJwt, job.jobId);
          job = next.jobStatus;
          updateVideoOnPost(postIdx, {
            upload: {
              phase: 'processing',
              progress: job.progress ? job.progress / 100 : undefined,
            },
          });
        }

        if (job.state === 'JOB_STATE_FAILED' || !job.blob) {
          throw new Error(job.error || job.message || 'Transcode failed');
        }

        updateVideoOnPost(postIdx, {
          blob: { $type: 'blob', ...job.blob },
          upload: undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        updateVideoOnPost(postIdx, { upload: { phase: 'error', message } });
      }
    },
    [jwtToken, currentAccount?.did, currentAccount?.pdsUrl, updateVideoOnPost],
  );

  const handleAddVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'video/mp4';
    const targetIndex = activeIndex;
    // Set the file metadata immediately so the preview row renders;
    // upload state is filled in by startVideoUpload as it progresses.
    setPosts((prev) =>
      prev.map((p, i) =>
        i === targetIndex
          ? {
              ...p,
              attachedImages: [],
              attachedVideo: {
                uri: asset.uri,
                mimeType,
                alt: '',
                aspectRatio:
                  asset.width && asset.height
                    ? { width: asset.width, height: asset.height }
                    : undefined,
              },
            }
          : p,
      ),
    );
    void startVideoUpload(targetIndex, { uri: asset.uri, mimeType });
  };

  // (per-post video remove / alt updates are inlined into the render
  // block so they can target the right thread index.)

  const handleRemoveImage = useCallback((postIdx: number, imageIdx: number) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === postIdx
          ? { ...p, attachedImages: p.attachedImages.filter((_, j) => j !== imageIdx) }
          : p,
      ),
    );
  }, []);

  const handleUpdateImageAlt = useCallback(
    (postIdx: number, imageIdx: number, alt: string) => {
      setPosts((prev) =>
        prev.map((p, i) =>
          i === postIdx
            ? {
                ...p,
                attachedImages: p.attachedImages.map((img, j) =>
                  j === imageIdx ? { ...img, alt } : img,
                ),
              }
            : p,
        ),
      );
    },
    [],
  );

  const handleAddGif = () => {
    setGifPickerVisible(true);
  };

  const handleInsertEmoji = (emoji: string) => {
    // Insert the emoji at the current cursor position. Falls back to
    // appending to the end when the user hasn't selected anywhere yet.
    const { start, end } = textSelection;
    const safeStart = Math.min(Math.max(start, 0), text.length);
    const safeEnd = Math.min(Math.max(end, safeStart), text.length);
    setText(text.slice(0, safeStart) + emoji + text.slice(safeEnd));
    const next = safeStart + emoji.length;
    setTextSelection({ start: next, end: next });
    setEmojiPickerVisible(false);
  };

  const handleSelectGif = (gif: AttachedImage) => {
    if (attachedImages.length < 4) {
      setAttachedImages([...attachedImages, gif]);
    }
  };

  const maxCharacters = 300;
  // Disable post when the root has no content, OR when any post in the
  // thread blew the character limit (we'd reject silently otherwise).
  const root = posts[0];
  const rootHasContent =
    root.text.trim().length > 0 ||
    root.attachedImages.length > 0 ||
    !!root.attachedVideo ||
    !!quote;
  const anyPostOverLimit = posts.some((p) => p.text.length > maxCharacters);
  // Block sending while any video is still uploading or transcoding.
  // An attached video without a `blob` ref isn't ready to embed.
  const anyVideoPending = posts.some(
    (p) => p.attachedVideo && !p.attachedVideo.blob,
  );
  const { requireAltText } = useAccessibilitySettings();
  // When the user opts in to "require alt text," any image (or video) in the
  // thread that's missing alt text blocks the post.
  const anyMediaMissingAlt =
    requireAltText &&
    posts.some(
      (p) =>
        p.attachedImages.some((img) => !img.alt.trim()) ||
        (p.attachedVideo && !p.attachedVideo.alt.trim()),
    );
  const isPostDisabled =
    !rootHasContent ||
    anyPostOverLimit ||
    anyVideoPending ||
    anyMediaMissingAlt ||
    createPostMutation.isPending;
  const previewPost: PostPreview | undefined = quote ?? replyTo?.preview;
  const characterCount = text.length;
  const isNearLimit = characterCount > maxCharacters * 0.8;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={nativePresentationStyle}
      transparent={isWeb}
      onRequestClose={handleClose}
    >
      {/*
       * ThemedView wraps KeyboardAvoidingView — not the other way around — so
       * the dark background always paints the full modal frame. With KAV on
       * the outside, when it shrinks (Android `behavior='height'` reserves
       * space for the keyboard accessory bar) the inner background shrinks
       * with it and the Modal's default opaque white shows through at the
       * bottom.
       */}
      <ThemedView
        testID="post-composer-container"
        style={[
          styles.container,
          { backgroundColor },
          isWeb && styles.webContainer,
          // `useSafeAreaInsets` returns 0 inside a Modal on Android (the
          // Modal is its own native window — SafeAreaProvider context
          // doesn't reach), so use `StatusBar.currentHeight` for the top
          // padding. iOS pageSheet auto-respects the safe area.
          !isWeb && {
            paddingTop:
              Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : top,
            paddingBottom: bottom,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
              {replyTo
                ? t('post.reply')
                : quote
                ? t('post.quotePost')
                : t('post.newPost')}
            </ThemedText>

            <TouchableOpacity
              onPress={handlePost}
              style={[
                styles.postButton,
                isPostDisabled ? styles.postButtonDisabled : styles.postButtonEnabled,
                { backgroundColor: isPostDisabled ? borderColor : tintColor },
              ]}
              disabled={isPostDisabled}
            >
              <ThemedText style={[styles.postButtonText, { color: isPostDisabled ? textColor : '#000000' }]}>
                {createPostMutation.isPending ? t('post.posting') : t('post.post')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Reply Context */}
          {replyTo && (
            <ThemedView
              style={[
                styles.replyContext,
                {
                  borderBottomColor: borderColor,
                },
              ]}
            >
              <View style={[styles.replyIconContainer, { backgroundColor: borderColor }]}>
                <IconSymbol name="arrowshape.turn.up.left" size={14} color={iconColor} />
              </View>
              <ThemedText style={[styles.replyText, { color: textColor }]}>
                {t('post.replyingTo')}{' '}
                <ThemedText style={[styles.replyAuthor, { color: tintColor }]}>@{replyTo.authorHandle}</ThemedText>
              </ThemedText>
            </ThemedView>
          )}

          {/* Content Area */}
          <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
            {/* Reply preview shown above input */}
            {replyTo && previewPost ? (
              <PostPreviewCard
                post={previewPost}
                borderColor={borderColor}
                textColor={textColor}
                iconColor={iconColor}
              />
            ) : null}

            {draftsApply && drafts.length > 0 ? (
              <View style={styles.draftsBar}>
                <TouchableOpacity
                  style={[styles.draftsPill, { borderColor }]}
                  onPress={() => {
                    draftsQuery.refetch();
                    setDraftsSheetVisible(true);
                  }}
                  accessibilityLabel={t('post.draft.title')}
                >
                  <IconSymbol name="square.and.pencil" size={14} color={tintColor} />
                  <ThemedText style={[styles.draftsPillText, { color: tintColor }]}>
                    {t('post.draft.openButton', { count: drafts.length })}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : null}

            {posts.map((post, postIdx) => {
              const isFirst = postIdx === 0;
              const isLast = postIdx === posts.length - 1;
              const isActive = postIdx === activeIndex;
              return (
                <View key={postIdx} style={styles.threadPostBlock}>
                  {!isFirst ? (
                    <View
                      style={[styles.threadDivider, { backgroundColor: borderColor }]}
                    />
                  ) : null}
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { color: textColor },
                        !isActive && styles.textInputInactive,
                        isWeb && { outline: 'none' },
                      ]}
                      value={post.text}
                      onChangeText={(next) =>
                        setPosts((prev) =>
                          prev.map((p, i) => (i === postIdx ? { ...p, text: next } : p)),
                        )
                      }
                      onFocus={() => setActiveIndex(postIdx)}
                      onSelectionChange={(e) => {
                        if (postIdx === activeIndex) {
                          setTextSelection(e.nativeEvent.selection);
                        }
                      }}
                      placeholder={
                        isFirst
                          ? replyTo
                            ? t('post.replyPlaceholder')
                            : t('post.postPlaceholder')
                          : t('post.continueThreadPlaceholder')
                      }
                      placeholderTextColor={iconColor}
                      multiline
                      autoFocus={isFirst}
                      autoCapitalize="none"
                      maxLength={maxCharacters}
                      textAlignVertical="top"
                      selectionColor={tintColor}
                      cursorColor={tintColor}
                    />
                    {!isFirst ? (
                      <TouchableOpacity
                        style={styles.removePostButton}
                        onPress={() => removePost(postIdx)}
                        accessibilityLabel={t('post.removePostFromThread')}
                        hitSlop={10}
                      >
                        <IconSymbol name="xmark.circle.fill" size={18} color={iconColor} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {isFirst && quote && previewPost ? (
                    <PostPreviewCard
                      post={previewPost}
                      borderColor={borderColor}
                      textColor={textColor}
                      iconColor={iconColor}
                    />
                  ) : null}

                  {post.attachedImages.length > 0 ? (
                    <View style={styles.imagesContainer}>
                      {post.attachedImages.map((image, imgIdx) => (
                        <View key={imgIdx} style={styles.imageItem}>
                          <View style={styles.imageContainer}>
                            <Image source={{ uri: image.uri }} style={styles.attachedImage} contentFit="contain" />
                            <TouchableOpacity
                              style={styles.removeImageButton}
                              onPress={() => handleRemoveImage(postIdx, imgIdx)}
                              testID={`remove-image-${postIdx}-${imgIdx}`}
                            >
                              <IconSymbol name="xmark" size={16} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.altTextInput, { color: textColor, borderColor, backgroundColor }]}
                            value={image.alt}
                            onChangeText={(alt) => handleUpdateImageAlt(postIdx, imgIdx, alt)}
                            placeholder={t('post.imageAltTextPlaceholder')}
                            placeholderTextColor={iconColor}
                            maxLength={1000}
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {post.attachedVideo ? (
                    <View style={styles.imagesContainer}>
                      <View style={styles.imageItem}>
                        <View
                          style={[
                            styles.imageContainer,
                            styles.videoPreview,
                            { borderColor },
                          ]}
                        >
                          <VideoThumbnail
                            uri={post.attachedVideo.uri}
                            style={styles.videoThumbnail}
                          />
                          <View style={styles.videoPreviewBody}>
                            <ThemedText
                              style={[styles.videoPreviewText, { color: textColor }]}
                              numberOfLines={1}
                            >
                              {post.attachedVideo.uri.split('/').pop() ?? t('common.video')}
                            </ThemedText>
                            {post.attachedVideo.upload ? (
                              <ThemedText
                                style={[styles.videoStatusText, { color: iconColor }]}
                                numberOfLines={1}
                              >
                                {post.attachedVideo.upload.phase === 'authorizing'
                                  ? t('post.video.preparing')
                                  : post.attachedVideo.upload.phase === 'uploading'
                                  ? t('post.video.uploading', {
                                      percent: Math.round(
                                        post.attachedVideo.upload.progress * 100,
                                      ),
                                    })
                                  : post.attachedVideo.upload.phase === 'processing'
                                  ? post.attachedVideo.upload.progress !== undefined
                                    ? t('post.video.processing', {
                                        percent: Math.round(
                                          post.attachedVideo.upload.progress * 100,
                                        ),
                                      })
                                    : t('post.video.processingIndeterminate')
                                  : post.attachedVideo.upload.message}
                              </ThemedText>
                            ) : post.attachedVideo.blob ? (
                              <ThemedText
                                style={[styles.videoStatusText, { color: iconColor }]}
                                numberOfLines={1}
                              >
                                {t('post.video.ready')}
                              </ThemedText>
                            ) : null}
                            {post.attachedVideo.upload?.phase === 'uploading' ||
                            post.attachedVideo.upload?.phase === 'processing' ? (
                              <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    { backgroundColor: tintColor },
                                    {
                                      width: `${
                                        Math.round(
                                          (post.attachedVideo.upload.phase === 'uploading'
                                            ? post.attachedVideo.upload.progress
                                            : post.attachedVideo.upload.progress ?? 0) *
                                            100,
                                        )
                                      }%`,
                                    },
                                  ]}
                                />
                              </View>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() =>
                              setPosts((prev) =>
                                prev.map((p, i) =>
                                  i === postIdx ? { ...p, attachedVideo: null } : p,
                                ),
                              )
                            }
                            testID={`remove-video-${postIdx}`}
                          >
                            <IconSymbol name="xmark" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[
                            styles.altTextInput,
                            { color: textColor, borderColor, backgroundColor },
                          ]}
                          value={post.attachedVideo.alt}
                          onChangeText={(alt) =>
                            setPosts((prev) =>
                              prev.map((p, i) =>
                                i === postIdx && p.attachedVideo
                                  ? { ...p, attachedVideo: { ...p.attachedVideo, alt } }
                                  : p,
                              ),
                            )
                          }
                          placeholder={t('post.imageAltTextPlaceholder')}
                          placeholderTextColor={iconColor}
                          maxLength={1000}
                        />
                      </View>
                    </View>
                  ) : null}

                  {isLast ? (
                    <TouchableOpacity
                      style={[styles.addPostButton, { borderColor }]}
                      onPress={addPost}
                      accessibilityLabel={t('post.addPostToThread')}
                    >
                      <IconSymbol name="plus" size={14} color={tintColor} />
                      <ThemedText style={[styles.addPostText, { color: tintColor }]}>
                        {t('post.addPostToThread')}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer with Character Count and Actions */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: borderColor,
              },
            ]}
          >
            <View style={styles.footerLeft}>
              {(() => {
                const photoDisabled = attachedImages.length >= 4 || !!attachedVideo;
                const videoDisabled = attachedImages.length > 0 || !!attachedVideo;
                const gifDisabled = attachedImages.length >= 4 || !!attachedVideo;
                return (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, photoDisabled && styles.actionButtonDisabled]}
                      onPress={handleAddImage}
                      disabled={photoDisabled}
                      accessibilityLabel={t('post.addPhoto')}
                      accessibilityHint={t('post.selectPhoto')}
                    >
                      <IconSymbol name="photo" size={20} color={photoDisabled ? iconColor : tintColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, videoDisabled && styles.actionButtonDisabled]}
                      onPress={handleAddVideo}
                      disabled={videoDisabled}
                      accessibilityLabel={t('post.addVideo')}
                    >
                      <IconSymbol name="video" size={20} color={videoDisabled ? iconColor : tintColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setEmojiPickerVisible(true)}
                      accessibilityLabel={t('post.addEmoji')}
                    >
                      <IconSymbol name="face.smiling" size={20} color={tintColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, gifDisabled && styles.actionButtonDisabled]}
                      onPress={handleAddGif}
                      disabled={gifDisabled}
                      accessibilityLabel={t('gif.addGif')}
                      accessibilityHint={t('gif.selectGif')}
                    >
                      <IconSymbol name="gif" size={20} color={gifDisabled ? iconColor : tintColor} />
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>

            <View style={styles.footerCenter} pointerEvents="box-none">
              {!replyTo ? (
                <TouchableOpacity
                  style={styles.controlsButton}
                  onPress={() => setControlsSheetVisible(true)}
                  accessibilityLabel={t('post.controls.title')}
                >
                  <IconSymbol name="bubble.left.and.bubble.right" size={16} color={tintColor} />
                  <ThemedText
                    style={[styles.controlsButtonText, { color: tintColor }]}
                    numberOfLines={1}
                  >
                    {describePostControls(postControls, t as any)}
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.footerRight}>
              <TouchableOpacity
                style={[styles.langChip, { borderColor: iconColor }]}
                onPress={() => setLanguagesSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('composer.postLanguageA11y', { value: postLangsLabel })}
              >
                <IconSymbol name="globe" size={fontSize.sm} color={iconColor} />
                <ThemedText style={[styles.langChipText, { color: iconColor }]} numberOfLines={1}>
                  {postLangs.length === 1 ? postLangs[0].toUpperCase() : `${postLangs.length}`}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.characterCountContainer}>
                <ThemedText
                  style={[
                    styles.characterCount,
                    {
                      color: isOverLimit ? '#FF3B30' : isNearLimit ? '#FF9500' : iconColor,
                    },
                  ]}
                >
                  {characterCount}
                </ThemedText>
                <ThemedText style={[styles.characterCount, { color: iconColor }]}>/{maxCharacters}</ThemedText>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>

      <PostLanguagesSheet
        visible={languagesSheetVisible}
        onClose={() => setLanguagesSheetVisible(false)}
        selected={postLangs}
        onChange={setPostLangs}
      />

      {/* GIF Picker Modal */}
      <GifPicker visible={gifPickerVisible} onClose={() => setGifPickerVisible(false)} onSelectGif={handleSelectGif} />
      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={handleInsertEmoji}
      />
      <PostControlsSheet
        visible={controlsSheetVisible}
        initialControls={postControls}
        onDismiss={() => setControlsSheetVisible(false)}
        onSave={(next) => {
          setPostControls(next);
          setControlsSheetVisible(false);
        }}
      />
      <DraftsSheet
        visible={draftsSheetVisible}
        drafts={drafts}
        onDismiss={() => setDraftsSheetVisible(false)}
        onSelect={handleSelectDraft}
        onDelete={handleDeleteDraft}
      />
    </Modal>
  );
}

type PostPreviewCardProps = {
  post: PostPreview;
  borderColor: string;
  textColor: string;
  iconColor: string;
};

function PostPreviewCard({ post, borderColor, textColor, iconColor }: PostPreviewCardProps) {
  const media = extractQuotedMedia({
    uri: '',
    cid: '',
    author: post.author,
    embed: post.embed,
    embeds: post.embeds,
  });
  const hasImages = media.images.length > 0;
  const hasVideo = !!media.video;
  const hasExternal = !!media.external;

  return (
    <View style={styles.quoteContainer}>
      <ThemedView style={[styles.quoteCard, { borderColor }]}>
        <View style={styles.quoteHeader}>
          {post.author.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.quoteAvatar} />
          ) : (
            <View style={[styles.quoteAvatar, { backgroundColor: borderColor }]} />
          )}
          <View style={styles.quoteAuthorText}>
            {post.author.displayName ? (
              <ThemedText
                style={[styles.quoteAuthorName, { color: textColor }]}
                numberOfLines={1}
              >
                {post.author.displayName}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[styles.quoteAuthorHandle, { color: iconColor }]}
              numberOfLines={1}
            >
              @{post.author.handle}
            </ThemedText>
          </View>
        </View>

        {post.text ? (
          <RichTextWithFacets
            text={post.text}
            facets={post.facets}
            disableLinks
            style={[styles.quoteText, { color: textColor }]}
          />
        ) : null}

        {hasVideo && media.video && (
          <View
            style={[
              styles.quoteMediaSingle,
              { aspectRatio: media.video.aspectRatio ?? 16 / 9 },
            ]}
          >
            <Image
              source={{ uri: media.video.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
            <View style={styles.quoteVideoBadge}>
              <IconSymbol name="play.fill" size={18} color="#ffffff" />
            </View>
          </View>
        )}

        {!hasVideo && hasImages && media.images.length === 1 && (
          <Image
            source={{ uri: media.images[0].url }}
            style={[
              styles.quoteImageSingle,
              { aspectRatio: media.images[0].aspectRatio ?? 1 },
            ]}
            contentFit="cover"
          />
        )}

        {!hasVideo && hasImages && media.images.length > 1 && (
          <View style={styles.quoteImagesRow}>
            {media.images.map((img, idx) => (
              <Image
                key={`${img.url}-${idx}`}
                source={{ uri: img.url }}
                style={styles.quoteImageThumb}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        {!hasVideo && !hasImages && hasExternal && media.external && (
          <View style={[styles.quoteMediaSingle, { aspectRatio: 1.91 }]}>
            <Image
              source={{ uri: media.external.thumb }}
              style={styles.quoteMediaImage}
              contentFit="cover"
            />
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '90%',
    marginVertical: spacing.xl,
    borderRadius: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  headerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonEnabled: {
    ...shadows.sm,
  },
  postButtonDisabled: {
    opacity: opacity.disabled,
  },
  postButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  replyIconContainer: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  replyText: {
    fontSize: 15,
    opacity: 0.8,
  },
  replyAuthor: {
    fontWeight: fontWeight.semibold,
  },
  contentArea: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  threadPostBlock: {
    // Each post in the thread is its own block; the divider between
    // them lives at the top so post #0 doesn't get one.
  },
  threadDivider: {
    height: layout.hairline,
    marginHorizontal: spacing.lg,
  },
  textInputInactive: {
    opacity: 0.7,
  },
  removePostButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  addPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: layout.hairline,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  addPostText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  draftsBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
  },
  draftsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  draftsPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quoteContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  quoteCard: {
    borderWidth: layout.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  quoteAuthorText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  quoteAuthorName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  quoteAuthorHandle: {
    fontSize: fontSize.sm,
  },
  quoteText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  quoteImagesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quoteImageThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  quoteImageSingle: {
    width: '100%',
    borderRadius: radius.sm,
  },
  quoteMediaSingle: {
    width: '100%',
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  quoteMediaImage: {
    width: '100%',
    height: '100%',
  },
  quoteVideoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageItem: {
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  videoPreview: {
    height: 120,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: 120,
    height: '100%',
  },
  videoPreviewText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  videoPreviewBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  videoStatusText: {
    fontSize: fontSize.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xxs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  attachedImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: spacing.md,
    padding: 6,
    width: spacing.xxl,
    height: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  altTextInput: {
    padding: spacing.md,
    fontSize: fontSize.base,
    borderTopWidth: layout.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    // Container is the positioning context for the absolute-centered
    // threadgate button (see footerCenter).
    position: 'relative',
  },
  controlsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    maxWidth: 220,
  },
  controlsButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  footerCenter: {
    // Absolute-position the centered control so it's centered on the
    // FOOTER (not split-the-difference of leftover space). pointerEvents
    // box-none lets taps still hit footerLeft / footerRight when the
    // button doesn't cover them.
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  langChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: opacity.tertiary,
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  characterCount: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
});
