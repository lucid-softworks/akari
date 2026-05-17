import { useCallback, useRef, useState } from 'react';

import {
  EMPTY_THREAD_POST,
  type AttachedImage,
  type AttachedVideo,
  type ThreadPost,
} from '@/utils/postComposer/types';

type SelectionRef = React.MutableRefObject<{ start: number; end: number }>;

type UseThreadPostsResult = {
  posts: ThreadPost[];
  setPosts: React.Dispatch<React.SetStateAction<ThreadPost[]>>;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  activePost: ThreadPost;
  setText: (next: string) => void;
  setAttachedImages: (
    next: AttachedImage[] | ((prev: AttachedImage[]) => AttachedImage[]),
  ) => void;
  addPost: () => void;
  removePost: (index: number) => void;
  removeImage: (postIdx: number, imageIdx: number) => void;
  updateImageAlt: (postIdx: number, imageIdx: number, alt: string) => void;
  removeVideo: (postIdx: number) => void;
  updateVideoAlt: (postIdx: number, alt: string) => void;
  applyVideoPatch: (postIdx: number, patch: Partial<AttachedVideo> | null) => void;
  setVideoUploadPhase: (postIdx: number, upload: AttachedVideo['upload']) => void;
  resetPosts: () => void;
  textSelectionRef: SelectionRef;
};

/**
 * Owns the `posts: ThreadPost[]` state plus all the position-keyed
 * mutations (text, images, video, attached-video uploads). Keeps the
 * parent composer free of repetitive `setPosts((prev) => prev.map(...))`
 * boilerplate.
 */
export function useThreadPosts(): UseThreadPostsResult {
  const [posts, setPosts] = useState<ThreadPost[]>([{ ...EMPTY_THREAD_POST }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const textSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const activePost = posts[activeIndex] ?? EMPTY_THREAD_POST;

  const setText = useCallback(
    (next: string) => {
      setPosts((prev) => prev.map((p, i) => (i === activeIndex ? { ...p, text: next } : p)));
    },
    [activeIndex],
  );

  const setAttachedImages = useCallback(
    (next: AttachedImage[] | ((prev: AttachedImage[]) => AttachedImage[])) => {
      setPosts((prevPosts) =>
        prevPosts.map((p, i) => {
          if (i !== activeIndex) return p;
          const resolved = typeof next === 'function' ? next(p.attachedImages) : next;
          return { ...p, attachedImages: resolved };
        }),
      );
    },
    [activeIndex],
  );

  const addPost = useCallback(() => {
    setPosts((prev) => [...prev, { ...EMPTY_THREAD_POST }]);
    setActiveIndex((prev) => prev + 1);
    textSelectionRef.current = { start: 0, end: 0 };
  }, []);

  const removePost = useCallback((index: number) => {
    setPosts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveIndex((prev) => (index <= prev ? Math.max(0, prev - 1) : prev));
  }, []);

  const removeImage = useCallback((postIdx: number, imageIdx: number) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === postIdx
          ? { ...p, attachedImages: p.attachedImages.filter((_, j) => j !== imageIdx) }
          : p,
      ),
    );
  }, []);

  const updateImageAlt = useCallback(
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

  const removeVideo = useCallback((postIdx: number) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === postIdx ? { ...p, attachedVideo: null } : p)),
    );
  }, []);

  const updateVideoAlt = useCallback((postIdx: number, alt: string) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === postIdx && p.attachedVideo
          ? { ...p, attachedVideo: { ...p.attachedVideo, alt } }
          : p,
      ),
    );
  }, []);

  const applyVideoPatch = useCallback(
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

  const setVideoUploadPhase = useCallback(
    (postIdx: number, upload: AttachedVideo['upload']) => {
      setPosts((prev) =>
        prev.map((p, i) =>
          i === postIdx && p.attachedVideo
            ? { ...p, attachedVideo: { ...p.attachedVideo, upload } }
            : p,
        ),
      );
    },
    [],
  );

  const resetPosts = useCallback(() => {
    setPosts([{ ...EMPTY_THREAD_POST }]);
    setActiveIndex(0);
  }, []);

  return {
    posts,
    setPosts,
    activeIndex,
    setActiveIndex,
    activePost,
    setText,
    setAttachedImages,
    addPost,
    removePost,
    removeImage,
    updateImageAlt,
    removeVideo,
    updateVideoAlt,
    applyVideoPatch,
    setVideoUploadPhase,
    resetPosts,
    textSelectionRef,
  };
}
