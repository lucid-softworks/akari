import {
  matchYouTubeId,
  resolveExternalThumb,
  vimeoThumbnailFor,
  youtubeThumbnailUrl,
} from '@/utils/embedThumb';

describe('resolveExternalThumb', () => {
  it('returns undefined for nullish / falsy thumbs', () => {
    expect(resolveExternalThumb(undefined)).toBeUndefined();
    expect(resolveExternalThumb(null)).toBeUndefined();
    expect(resolveExternalThumb('')).toBeUndefined();
    expect(resolveExternalThumb(0)).toBeUndefined();
  });

  it('returns a string thumb (view shape) as-is', () => {
    expect(resolveExternalThumb('https://example.com/thumb.jpg')).toBe(
      'https://example.com/thumb.jpg',
    );
  });

  it('extracts the $link from a blob ref (record shape)', () => {
    expect(resolveExternalThumb({ ref: { $link: 'bafycid' } })).toBe('bafycid');
  });

  it('returns undefined when the object has no usable ref', () => {
    expect(resolveExternalThumb({})).toBeUndefined();
    expect(resolveExternalThumb({ ref: {} })).toBeUndefined();
    expect(resolveExternalThumb({ ref: { $link: undefined } })).toBeUndefined();
  });

  it('returns undefined for other primitive types', () => {
    expect(resolveExternalThumb(true)).toBeUndefined();
    expect(resolveExternalThumb(42)).toBeUndefined();
  });
});

describe('youtubeThumbnailUrl', () => {
  it('builds the hqdefault url for a video id', () => {
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});

describe('matchYouTubeId', () => {
  it('matches standard watch urls', () => {
    expect(matchYouTubeId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
  });

  it('matches youtu.be short urls', () => {
    expect(matchYouTubeId('https://youtu.be/abc123')).toBe('abc123');
  });

  it('matches music.youtube.com watch urls', () => {
    expect(matchYouTubeId('https://music.youtube.com/watch?v=abc123')).toBe('abc123');
  });

  it('matches embed urls', () => {
    expect(matchYouTubeId('https://www.youtube.com/embed/abc123')).toBe('abc123');
  });

  it('matches shorts urls', () => {
    expect(matchYouTubeId('https://youtube.com/shorts/abc123')).toBe('abc123');
  });

  it('stops the id at query params and fragments', () => {
    expect(matchYouTubeId('https://www.youtube.com/watch?v=abc123&t=10s')).toBe('abc123');
  });

  it('returns null for non-youtube urls', () => {
    expect(matchYouTubeId('https://example.com/video')).toBeNull();
    expect(matchYouTubeId('https://vimeo.com/12345')).toBeNull();
  });
});

describe('vimeoThumbnailFor', () => {
  it('always returns null (no public no-API pattern)', () => {
    expect(vimeoThumbnailFor('https://vimeo.com/12345')).toBeNull();
    expect(vimeoThumbnailFor('')).toBeNull();
  });
});
