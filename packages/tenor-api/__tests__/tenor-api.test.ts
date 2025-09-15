import { TenorAPI, type TenorGif, type TenorSearchResponse, type TenorTrendingResponse } from '../src';

describe('TenorAPI', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const createGif = (overrides: Partial<TenorGif> = {}): TenorGif => {
    const base: TenorGif = {
      id: 'gif-id',
      title: 'Example GIF',
      media_formats: {
        gif: { url: 'https://example.com/gif.gif', dims: [120, 80], size: 1_234 },
      },
      created: 0,
      content_description: 'Example description',
      itemurl: 'https://tenor.com/gif',
      url: 'https://example.com/gif.gif',
      tags: [],
      flags: [],
      hasaudio: false,
    };

    return {
      ...base,
      ...overrides,
      media_formats: overrides.media_formats ?? base.media_formats,
    };
  };

  it('searchGifs builds the correct request and returns data', async () => {
    const payload: TenorSearchResponse = { results: [], next: 'cursor-2' };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const api = new TenorAPI('test-key');
    const result = await api.searchGifs('cats', 5, 'cursor-1');

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://tenor.googleapis.com/v2/search');
    expect(requestUrl.searchParams.get('q')).toBe('cats');
    expect(requestUrl.searchParams.get('limit')).toBe('5');
    expect(requestUrl.searchParams.get('pos')).toBe('cursor-1');
    expect(requestUrl.searchParams.get('key')).toBe('test-key');
    expect(requestUrl.searchParams.get('media_filter')).toBe('gif');
    expect(requestUrl.searchParams.get('contentfilter')).toBe('medium');
  });

  it('searchGifs omits optional parameters when not provided', async () => {
    const payload: TenorSearchResponse = { results: [], next: 'cursor' };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const api = new TenorAPI('test-key');
    await api.searchGifs('dogs');

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.searchParams.get('limit')).toBe('20');
    expect(requestUrl.searchParams.get('pos')).toBeNull();
  });

  it('searchGifs throws an error when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

    const api = new TenorAPI('test-key');
    await expect(api.searchGifs('cats')).rejects.toThrow('Tenor API error: 500 Server Error');
  });

  it('getTrendingGifs builds the correct request and returns data', async () => {
    const payload: TenorTrendingResponse = { results: [], next: 'cursor' };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const api = new TenorAPI('test-key');
    const result = await api.getTrendingGifs(10, 'cursor-1');

    expect(result).toEqual(payload);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://tenor.googleapis.com/v2/featured');
    expect(requestUrl.searchParams.get('limit')).toBe('10');
    expect(requestUrl.searchParams.get('pos')).toBe('cursor-1');
    expect(requestUrl.searchParams.get('key')).toBe('test-key');
  });

  it('getTrendingGifs uses defaults when arguments are omitted', async () => {
    const payload: TenorTrendingResponse = { results: [], next: 'cursor' };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const api = new TenorAPI('test-key');
    await api.getTrendingGifs();

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.searchParams.get('limit')).toBe('20');
    expect(requestUrl.searchParams.get('pos')).toBeNull();
  });

  it('getTrendingGifs throws an error when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const api = new TenorAPI('test-key');
    await expect(api.getTrendingGifs()).rejects.toThrow('Tenor API error: 404 Not Found');
  });

  it('getGifById fetches the GIF and returns the first result', async () => {
    const gif = createGif();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [gif] }),
    });

    const api = new TenorAPI('test-key');
    const result = await api.getGifById('gif-id');

    expect(result).toBe(gif);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://tenor.googleapis.com/v2/posts');
    expect(requestUrl.searchParams.get('ids')).toBe('gif-id');
  });

  it('getGifById throws an error when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' });

    const api = new TenorAPI('test-key');
    await expect(api.getGifById('gif-id')).rejects.toThrow('Tenor API error: 400 Bad Request');
  });

  it('downloadGifAsBlob returns the blob from the response', async () => {
    const blob = { size: 123 } as unknown as Blob;
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });

    const api = new TenorAPI('test-key');
    const result = await api.downloadGifAsBlob('https://example.com/g.gif');

    expect(result).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/g.gif');
  });

  it('downloadGifAsBlob throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Failure' });

    const api = new TenorAPI('test-key');
    await expect(api.downloadGifAsBlob('https://example.com/g.gif')).rejects.toThrow(
      'Failed to download GIF: 503 Failure',
    );
  });

  it('convertGifToAttachedImage includes dimensions for the gif format', () => {
    const gif = createGif();
    const api = new TenorAPI('test-key');

    const image = api.convertGifToAttachedImage(gif);
    const url = new URL(image.uri);

    expect(url.searchParams.get('ww')).toBe('120');
    expect(url.searchParams.get('hh')).toBe('80');
    expect(image.alt).toBe(gif.content_description);
    expect(image.tenorId).toBe(gif.id);
  });

  it('convertGifToAttachedImage falls back to other media formats and defaults alt text', () => {
    const gif = createGif({
      media_formats: {
        tinygif: { url: 'https://example.com/tiny.gif', dims: [60, 40], size: 512 },
      },
      url: 'https://example.com/fallback.gif',
      content_description: '',
      title: '',
    });
    const api = new TenorAPI('test-key');

    const image = api.convertGifToAttachedImage(gif);
    const url = new URL(image.uri);

    expect(image.uri).toContain('https://example.com/tiny.gif');
    expect(url.searchParams.get('ww')).toBe('60');
    expect(url.searchParams.get('hh')).toBe('40');
    expect(image.alt).toBe('GIF');
  });

  it('convertGifToAttachedImage uses the GIF url when no media formats exist', () => {
    const gif = createGif({
      media_formats: {} as TenorGif['media_formats'],
      url: 'https://example.com/direct.gif',
      content_description: 'Direct description',
    });
    const api = new TenorAPI('test-key');

    const image = api.convertGifToAttachedImage(gif);

    expect(image.uri).toBe('https://example.com/direct.gif');
    expect(image.alt).toBe('Direct description');
  });

  it('convertGifToAttachedImage omits dimension parameters when none are available', () => {
    const gif = createGif();
    delete (gif.media_formats.gif as any).dims;
    const api = new TenorAPI('test-key');

    const image = api.convertGifToAttachedImage(gif);
    const url = new URL(image.uri);

    expect(url.searchParams.get('ww')).toBeNull();
    expect(url.searchParams.get('hh')).toBeNull();
  });

  it('convertGifToAttachedImage throws when no valid url can be found', () => {
    const gif = createGif({
      media_formats: {} as TenorGif['media_formats'],
      url: '',
    });
    const api = new TenorAPI('test-key');

    expect(() => api.convertGifToAttachedImage(gif)).toThrow('No valid GIF URL found in media formats');
  });
});
