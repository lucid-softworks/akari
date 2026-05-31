import { normalizeInstanceUrl, verifyInstance } from '@/utils/mastodon/discovery';

describe('normalizeInstanceUrl', () => {
  it('prefixes a bare domain with https', () => {
    expect(normalizeInstanceUrl('mastodon.social')).toBe('https://mastodon.social');
  });

  it('strips an existing scheme and trailing slashes', () => {
    expect(normalizeInstanceUrl('https://mastodon.social/')).toBe('https://mastodon.social');
    expect(normalizeInstanceUrl('http://example.org//')).toBe('https://example.org');
  });

  it('lowercases the host and trims surrounding whitespace', () => {
    expect(normalizeInstanceUrl('  Mastodon.Social  ')).toBe('https://mastodon.social');
  });

  it('extracts the instance from a user@instance address', () => {
    expect(normalizeInstanceUrl('alice@mastodon.social')).toBe('https://mastodon.social');
  });

  it('strips a leading @ before splitting', () => {
    expect(normalizeInstanceUrl('@alice@mastodon.social')).toBe('https://mastodon.social');
  });

  it('throws on empty or obviously invalid input', () => {
    expect(() => normalizeInstanceUrl('')).toThrow();
    expect(() => normalizeInstanceUrl('notadomain')).toThrow();
    expect(() => normalizeInstanceUrl('has space.social')).toThrow();
  });
});

describe('verifyInstance', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockFetch(payload: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 404,
      json: async () => payload,
    }) as unknown as typeof fetch;
  }

  it('queries the instance metadata endpoint and returns the title', async () => {
    mockFetch({ uri: 'mastodon.social', title: 'Mastodon' });
    const info = await verifyInstance('https://mastodon.social');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mastodon.social/api/v1/instance',
      expect.anything(),
    );
    expect(info).toEqual({ url: 'https://mastodon.social', title: 'Mastodon' });
  });

  it('tolerates metadata with no title', async () => {
    mockFetch({});
    const info = await verifyInstance('https://example.org');
    expect(info).toEqual({ url: 'https://example.org', title: undefined });
  });

  it('throws when the server responds non-ok', async () => {
    mockFetch(null, false);
    await expect(verifyInstance('https://example.org')).rejects.toThrow(/fediverse server/);
  });

  it('throws a reachability error when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(verifyInstance('https://example.org')).rejects.toThrow(/Could not reach/);
  });
});
