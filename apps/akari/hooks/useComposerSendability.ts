import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings';
import {
  MAX_POST_CHARACTERS,
  type ComposeMode,
  type QuotedPost,
  type ThreadPost,
} from '@/utils/postComposer/types';

type UseComposerSendabilityOptions = {
  composeMode: ComposeMode;
  posts: ThreadPost[];
  longText: string;
  longTitle: string;
  quote?: QuotedPost;
  isPosting: boolean;
  isPublishingLongform: boolean;
};

/**
 * Computes the booleans that gate the publish button:
 *   - whether the root post has any content
 *   - whether any thread post is over the character cap
 *   - whether a video is still uploading / transcoding
 *   - whether the user requires alt text and any image/video is missing it
 *   - whether a publish mutation is in flight
 */
export function useComposerSendability({
  composeMode,
  posts,
  longText,
  longTitle,
  quote,
  isPosting,
  isPublishingLongform,
}: UseComposerSendabilityOptions): { isPostDisabled: boolean } {
  const { requireAltText } = useAccessibilitySettings();
  const isLongMode = composeMode !== 'standard';
  const root = posts[0];

  const standardRootHasContent =
    root.text.trim().length > 0 ||
    root.attachedImages.length > 0 ||
    !!root.attachedVideo ||
    !!quote;
  const longformReady =
    longTitle.trim().length > 0 && longText.trim().length > 0;
  const autothreadReady =
    longText.trim().length > 0 ||
    root.attachedImages.length > 0 ||
    !!root.attachedVideo ||
    !!quote;
  const longRootHasContent =
    composeMode === 'longform' ? longformReady : autothreadReady;
  const rootHasContent = isLongMode ? longRootHasContent : standardRootHasContent;

  const anyPostOverLimit =
    composeMode === 'standard' &&
    posts.some((p) => p.text.length > MAX_POST_CHARACTERS);
  const anyVideoPending = posts.some(
    (p) => p.attachedVideo && !p.attachedVideo.blob,
  );
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
    !!anyMediaMissingAlt ||
    isPosting ||
    isPublishingLongform;

  return { isPostDisabled };
}
