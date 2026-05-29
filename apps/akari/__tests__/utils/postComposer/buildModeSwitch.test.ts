import { buildModeSwitch } from '@/utils/postComposer/buildModeSwitch';
import { EMPTY_THREAD_POST, type ThreadPost } from '@/utils/postComposer/types';

const post = (over: Partial<ThreadPost> = {}): ThreadPost => ({
  ...EMPTY_THREAD_POST,
  ...over,
});

describe('buildModeSwitch', () => {
  it('returns null when the mode does not change', () => {
    expect(buildModeSwitch('standard', 'standard', [post({ text: 'hi' })], '')).toBeNull();
  });

  describe('standard -> autothread/longform', () => {
    it('concatenates non-empty post texts into longText', () => {
      const result = buildModeSwitch(
        'standard',
        'autothread',
        [post({ text: 'first' }), post({ text: '  ' }), post({ text: 'third' })],
        '',
      );
      expect(result?.nextLongText).toBe('first\n\nthird');
    });

    it('omits longText when there is nothing to carry', () => {
      const result = buildModeSwitch('standard', 'longform', [post({ text: '  ' })], '');
      expect(result?.nextLongText).toBeUndefined();
    });

    it('keeps the first post media when switching to autothread but clears the text', () => {
      const media = post({ text: 'a', attachedImages: [{ uri: 'x', alt: '', mimeType: 'image/png' }] });
      const result = buildModeSwitch('standard', 'autothread', [media], '');
      expect(result?.nextPosts).toHaveLength(1);
      expect(result?.nextPosts[0].attachedImages).toEqual(media.attachedImages);
      expect(result?.nextPosts[0].text).toBe('');
    });

    it('drops media when switching to longform', () => {
      const media = post({ text: 'a', attachedImages: [{ uri: 'x', alt: '', mimeType: 'image/png' }] });
      const result = buildModeSwitch('standard', 'longform', [media], '');
      expect(result?.nextPosts).toEqual([EMPTY_THREAD_POST]);
    });
  });

  describe('autothread/longform -> standard', () => {
    it('splits longText back into a thread, preserving first-post media', () => {
      const media = post({ attachedImages: [{ uri: 'x', alt: '', mimeType: 'image/png' }] });
      const long = `${'a'.repeat(290)}\n\n${'b'.repeat(290)}`;
      const result = buildModeSwitch('autothread', 'standard', [media], long);
      expect(result?.nextPosts.length).toBeGreaterThan(1);
      expect(result?.nextPosts[0].attachedImages).toEqual(media.attachedImages);
      expect(result?.nextPosts[1].attachedImages).toEqual([]);
    });

    it('produces a single empty post when longText is blank', () => {
      const media = post({ attachedImages: [{ uri: 'x', alt: '', mimeType: 'image/png' }] });
      const result = buildModeSwitch('longform', 'standard', [media], '   ');
      expect(result?.nextPosts).toHaveLength(1);
      expect(result?.nextPosts[0].text).toBe('');
      expect(result?.nextPosts[0].attachedImages).toEqual(media.attachedImages);
    });
  });

  describe('autothread <-> longform', () => {
    it('drops media going autothread -> longform', () => {
      const result = buildModeSwitch('autothread', 'longform', [post({ text: 'x' })], 'body');
      expect(result?.nextPosts).toEqual([EMPTY_THREAD_POST]);
    });

    it('carries posts through going longform -> autothread', () => {
      const posts = [post({ text: 'x' })];
      const result = buildModeSwitch('longform', 'autothread', posts, 'body');
      expect(result?.nextPosts).toBe(posts);
    });
  });
});
