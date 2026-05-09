import { isGifEmbedUri } from '@/utils/gifEmbed';

describe('isGifEmbedUri', () => {
  it('returns false for empty / nullish input', () => {
    expect(isGifEmbedUri(undefined)).toBe(false);
    expect(isGifEmbedUri(null)).toBe(false);
    expect(isGifEmbedUri('')).toBe(false);
  });

  it('matches plain .gif paths', () => {
    expect(isGifEmbedUri('https://example.com/foo.gif')).toBe(true);
    expect(isGifEmbedUri('https://example.com/foo.GIF')).toBe(true);
    expect(isGifEmbedUri('https://example.com/foo.gifv')).toBe(true);
  });

  it('matches .gif paths even when followed by a query string or fragment', () => {
    // The Klipy embed shape that broke the original endsWith check.
    expect(
      isGifEmbedUri(
        'https://static.klipy.com/ii/4e7bea/foo.gif?hh=245&ww=206&mp4=abc&webm=def',
      ),
    ).toBe(true);
    expect(isGifEmbedUri('https://example.com/foo.gif#frag')).toBe(true);
  });

  it('matches well-known GIF providers regardless of extension', () => {
    expect(isGifEmbedUri('https://media.tenor.com/abc/def')).toBe(true);
    expect(isGifEmbedUri('https://www.tenor.com/view/something')).toBe(true);
    expect(isGifEmbedUri('https://media.giphy.com/foo')).toBe(true);
    expect(isGifEmbedUri('https://media2.giphy.com/foo')).toBe(true);
    expect(isGifEmbedUri('https://klipy.com/foo')).toBe(true);
    expect(isGifEmbedUri('https://i.imgur.com/abc')).toBe(true);
  });

  it('does not match link cards from regular sites', () => {
    expect(isGifEmbedUri('https://example.com/article')).toBe(false);
    expect(isGifEmbedUri('https://news.ycombinator.com/item?id=1')).toBe(false);
    expect(isGifEmbedUri('https://example.com/foo.png')).toBe(false);
  });

  it('falls back to path matching when URL parsing fails', () => {
    expect(isGifEmbedUri('not-a-url/foo.gif?x=y')).toBe(true);
    expect(isGifEmbedUri('not-a-url/foo.png')).toBe(false);
  });
});
