import { TenorAPI } from '@/utils/tenor';

describe('TenorAPI', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('searches GIFs with correct parameters', async () => {
    const mockData = { results: [], next: 'abc' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const api = new TenorAPI('test');
    const result = await api.searchGifs('cats', 5, '1');

    expect(result).toEqual(mockData);
    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url.pathname).toBe('/v2/search');
    expect(url.searchParams.get('q')).toBe('cats');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('pos')).toBe('1');
    expect(url.searchParams.get('key')).toBe('test');
  });

  it('throws when searchGifs fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, statusText: 'Error' });

    const api = new TenorAPI('test');
    await expect(api.searchGifs('cats')).rejects.toThrow('Tenor API error: 500 Error');
  });

  it('retrieves trending GIFs', async () => {
    const mockData = { results: [], next: 'def' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const api = new TenorAPI('key');
    const result = await api.getTrendingGifs(20, '2');

    expect(result).toEqual(mockData);
    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url.pathname).toBe('/v2/featured');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('pos')).toBe('2');
  });

  it('throws when getTrendingGifs fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const api = new TenorAPI('key');
    await expect(api.getTrendingGifs()).rejects.toThrow('Tenor API error: 404 Not Found');
  });

  it('gets GIF by id', async () => {
    const gif = { id: '1', media_formats: { gif: { url: 'u', dims: [1, 1], size: 1 } }, created: 0, title: '', content_description: '', itemurl: '', url: 'u', tags: [], flags: [], hasaudio: false };
    const mockData = { results: [gif] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const api = new TenorAPI('key');
    const result = await api.getGifById('1');
    expect(result).toBe(gif);
    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url.pathname).toBe('/v2/posts');
    expect(url.searchParams.get('ids')).toBe('1');
  });

  it('throws when getGifById fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400, statusText: 'Bad' });
    const api = new TenorAPI('k');
    await expect(api.getGifById('1')).rejects.toThrow('Tenor API error: 400 Bad');
  });

  it('downloads GIF as blob', async () => {
    const mockBlob = new Blob(['data']);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    const api = new TenorAPI('k');
    const result = await api.downloadGifAsBlob('https://example.com/g.gif');
    expect(result).toBe(mockBlob);
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/g.gif');
  });

  it('throws when downloadGifAsBlob fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, statusText: 'Fail' });
    const api = new TenorAPI('k');
    await expect(api.downloadGifAsBlob('https://example.com/g.gif')).rejects.toThrow('Failed to download GIF: 500 Fail');
  });

  it('converts GIF to attached image', () => {
    const gif = {
      id: '1',
      title: 't',
      media_formats: { gif: { url: 'https://example.com/a.gif', dims: [100, 200], size: 1 } },
      created: 0,
      content_description: 'desc',
      itemurl: 'i',
      url: 'https://example.com/a.gif',
      tags: [],
      flags: [],
      hasaudio: false,
    };

    const api = new TenorAPI('k');
    const result = api.convertGifToAttachedImage(gif);
    const url = new URL(result.uri);
    expect(result.alt).toBe('desc');
    expect(url.searchParams.get('ww')).toBe('100');
    expect(url.searchParams.get('hh')).toBe('200');
    expect(result.tenorId).toBe('1');
  });

  it('handles GIF without format dimensions', () => {
    const gif = {
      id: '2',
      title: 't',
      media_formats: {},
      created: 0,
      content_description: '',
      itemurl: '',
      url: 'https://example.com/b.gif',
      tags: [],
      flags: [],
      hasaudio: false,
    } as any;

    const api = new TenorAPI('k');
    const result = api.convertGifToAttachedImage(gif);
    const url = new URL(result.uri);
    expect(url.searchParams.get('ww')).toBeNull();
    expect(url.searchParams.get('hh')).toBeNull();
  });

  it('defaults alt text when description and title missing', () => {
    const gif = {
      id: '3',
      title: '',
      media_formats: { gif: { url: 'https://example.com/c.gif', dims: [1, 1], size: 1 } },
      created: 0,
      content_description: '',
      itemurl: '',
      url: 'https://example.com/c.gif',
      tags: [],
      flags: [],
      hasaudio: false,
    };

    const api = new TenorAPI('k');
    const result = api.convertGifToAttachedImage(gif);
    expect(result.alt).toBe('GIF');
  });

  it('throws when no valid GIF URL', () => {
    const gif = {
      id: '1',
      title: '',
      media_formats: {},
      created: 0,
      content_description: '',
      itemurl: '',
      url: '',
      tags: [],
      flags: [],
      hasaudio: false,
    } as any;

    const api = new TenorAPI('k');
    expect(() => api.convertGifToAttachedImage(gif)).toThrow('No valid GIF URL found in media formats');
  });
});

