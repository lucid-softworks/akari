import type { AttachedImage, AttachedVideo, ComposeMode, ThreadPost } from '@/utils/postComposer/types';

type UseComposerMediaButtonsOptions = {
  composeMode: ComposeMode;
  rootPost: ThreadPost;
  activePostImages: AttachedImage[];
  activePostVideo: AttachedVideo | null;
};

type UseComposerMediaButtonsResult = {
  photoDisabled: boolean;
  videoDisabled: boolean;
  gifDisabled: boolean;
};

/**
 * Whether each footer media button should be disabled.
 *
 * In long-form mode all atproto-flavored media is hidden. Otherwise:
 *   - photos / gifs share the "max 4 images, video mutually exclusive" rule
 *   - video is disabled while any image is attached or another video exists
 *
 * In auto-thread mode media lives on `posts[0]`; in standard mode it's on
 * the active post.
 */
export function useComposerMediaButtons({
  composeMode,
  rootPost,
  activePostImages,
  activePostVideo,
}: UseComposerMediaButtonsOptions): UseComposerMediaButtonsResult {
  const isLongMode = composeMode !== 'standard';
  const isLongform = composeMode === 'longform';
  const host = isLongMode
    ? rootPost
    : { attachedImages: activePostImages, attachedVideo: activePostVideo };

  const photoDisabled =
    isLongform || host.attachedImages.length >= 4 || !!host.attachedVideo;
  const videoDisabled =
    isLongform || host.attachedImages.length > 0 || !!host.attachedVideo;
  const gifDisabled =
    isLongform || host.attachedImages.length >= 4 || !!host.attachedVideo;

  return { photoDisabled, videoDisabled, gifDisabled };
}
