import { extractQuotedMedia } from '@/utils/postComposer/extractQuotedMedia';
import type { QuotedPost } from '@/utils/postComposer/types';

const quote = (over: Partial<QuotedPost>): QuotedPost => ({
  uri: 'at://x',
  cid: 'cid',
  author: { handle: 'a.test' },
  ...over,
});

describe('extractQuotedMedia', () => {
  it('returns empty defaults when there is no quote', () => {
    expect(extractQuotedMedia(undefined)).toEqual({ images: [], video: null, external: null });
  });

  it('extracts images with aspect ratios from an images embed', () => {
    const result = extractQuotedMedia(
      quote({
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [
            { thumb: 'thumb-1', aspectRatio: { width: 2, height: 1 } },
            { fullsize: 'full-2' },
          ],
        } as never,
      }),
    );
    expect(result.images).toEqual([
      { url: 'thumb-1', aspectRatio: 2 },
      { url: 'full-2', aspectRatio: undefined },
    ]);
  });

  it('skips video-mime images and caps at four images', () => {
    const images = Array.from({ length: 6 }, (_, i) => ({ thumb: `t${i}` }));
    images.splice(1, 0, { thumb: 'vid', image: { mimeType: 'video/mp4' } } as never);
    const result = extractQuotedMedia(
      quote({ embed: { $type: 'app.bsky.embed.images', images } as never }),
    );
    expect(result.images).toHaveLength(4);
    expect(result.images.some((i) => i.url === 'vid')).toBe(false);
  });

  it('extracts a video thumbnail with aspect ratio', () => {
    const result = extractQuotedMedia(
      quote({
        embed: {
          $type: 'app.bsky.embed.video#view',
          thumbnail: 'video-thumb',
          aspectRatio: { width: 16, height: 9 },
        } as never,
      }),
    );
    expect(result.video).toEqual({ thumb: 'video-thumb', aspectRatio: 16 / 9 });
  });

  it('ignores zero-sized aspect ratios', () => {
    const result = extractQuotedMedia(
      quote({
        embed: {
          $type: 'app.bsky.embed.video#view',
          thumbnail: 'video-thumb',
          aspectRatio: { width: 0, height: 9 },
        } as never,
      }),
    );
    expect(result.video).toEqual({ thumb: 'video-thumb', aspectRatio: undefined });
  });

  it('extracts an external thumbnail blob ref', () => {
    const result = extractQuotedMedia(
      quote({
        embed: {
          $type: 'app.bsky.embed.external#view',
          external: { thumb: { ref: { $link: 'ext-link' } } },
        } as never,
      }),
    );
    expect(result.external).toEqual({ thumb: 'ext-link' });
  });

  it('descends into recordWithMedia embeds', () => {
    const result = extractQuotedMedia(
      quote({
        embed: {
          $type: 'app.bsky.embed.recordWithMedia#view',
          media: { $type: 'app.bsky.embed.images#view', images: [{ thumb: 'nested' }] },
        } as never,
      }),
    );
    expect(result.images).toEqual([{ url: 'nested', aspectRatio: undefined }]);
  });

  it('combines embed and embeds arrays', () => {
    const result = extractQuotedMedia(
      quote({
        embed: { $type: 'app.bsky.embed.images#view', images: [{ thumb: 'a' }] } as never,
        embeds: [{ $type: 'app.bsky.embed.video#view', thumbnail: 'b' } as never],
      }),
    );
    expect(result.images).toEqual([{ url: 'a', aspectRatio: undefined }]);
    expect(result.video).toEqual({ thumb: 'b', aspectRatio: undefined });
  });
});
