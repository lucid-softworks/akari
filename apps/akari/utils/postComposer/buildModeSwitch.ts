import {
  EMPTY_THREAD_POST,
  MAX_POST_CHARACTERS,
  type ComposeMode,
  type ThreadPost,
} from './types';
import { splitForThread } from '@/utils/threadSplitter';

type ModeSwitchResult = {
  nextPosts: ThreadPost[];
  nextLongText?: string;
};

/**
 * Computes the next `posts` / `longText` shape when the user toggles the
 * compose mode. Pure; the parent applies the result via its setters.
 *
 *   - standard -> autothread/longform: glue all post texts into longText.
 *   - autothread/longform -> standard: split longText back into a thread.
 *   - autothread <-> longform: longText carries straight across.
 *
 * Media (images/video) only makes sense in standard/autothread, so we
 * drop it on entry to longform.
 */
export function buildModeSwitch(
  from: ComposeMode,
  to: ComposeMode,
  posts: ThreadPost[],
  longText: string,
): ModeSwitchResult | null {
  if (to === from) return null;

  if (to === 'standard' && from !== 'standard') {
    const chunks = splitForThread(longText, MAX_POST_CHARACTERS);
    const media = posts[0] ?? EMPTY_THREAD_POST;
    if (chunks.length === 0) {
      return { nextPosts: [{ ...media, text: '' }] };
    }
    return {
      nextPosts: chunks.map((chunkText, i) =>
        i === 0
          ? {
              text: chunkText,
              attachedImages: media.attachedImages,
              attachedVideo: media.attachedVideo,
            }
          : { text: chunkText, attachedImages: [], attachedVideo: null },
      ),
    };
  }

  if (to !== 'standard' && from === 'standard') {
    const concatenated = posts
      .flatMap((p) => (p.text.trim().length > 0 ? [p.text] : []))
      .join('\n\n');
    const first = posts[0] ?? EMPTY_THREAD_POST;
    return {
      nextPosts: [
        to === 'longform' ? { ...EMPTY_THREAD_POST } : { ...first, text: '' },
      ],
      nextLongText: concatenated.length > 0 ? concatenated : undefined,
    };
  }

  if (to === 'longform') {
    // autothread -> longform: drop any media on the first post.
    return { nextPosts: [{ ...EMPTY_THREAD_POST }] };
  }

  // longform -> autothread (other transitions are no-ops aside from mode).
  return { nextPosts: posts };
}
