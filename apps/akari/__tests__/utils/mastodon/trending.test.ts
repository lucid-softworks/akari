import { fetchMastodonTrending } from '@/utils/mastodon/trending';

const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const baseInput = {
  instanceUrl: 'https://mastodon.social',
  accessToken: 'token-123',
};

describe('fetchMastodonTrending', () => {
  it('hits /api/v1/trends/statuses with limit + Authorization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await fetchMastodonTrending({ ...baseInput, limit: 10 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/trends/statuses');
    expect(url).toContain('limit=10');
    // No offset on the first page.
    expect(url).not.toContain('offset=');
    expect(opts.headers.Authorization).toBe('Bearer token-123');
  });

  it('passes offset when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => Array.from({ length: 20 }, (_, i) => ({ id: String(i) })),
    });
    await fetchMastodonTrending({ ...baseInput, limit: 20, offset: 40 });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('offset=40');
  });

  it('returns nextOffset = previous + page length when a full page came back', async () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => full,
    });
    const result = await fetchMastodonTrending({ ...baseInput, limit: 20, offset: 20 });
    expect(result.statuses).toHaveLength(20);
    expect(result.nextOffset).toBe(40);
  });

  it('returns nextOffset = undefined on a short page', async () => {
    const partial = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => partial,
    });
    const result = await fetchMastodonTrending({ ...baseInput, limit: 20 });
    expect(result.statuses).toHaveLength(5);
    expect(result.nextOffset).toBeUndefined();
  });

  it('treats 404 as "server does not support trending" → empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => null });
    const result = await fetchMastodonTrending(baseInput);
    expect(result).toEqual({ statuses: [], nextOffset: undefined });
  });

  it('throws on other non-2xx responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => null });
    await expect(fetchMastodonTrending(baseInput)).rejects.toThrow(/HTTP 500/);
  });
});
