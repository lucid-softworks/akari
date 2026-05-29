import { fetchFavicon, getDomainFromUrl } from '@/utils/faviconUtils';

describe('getDomainFromUrl', () => {
  it('extracts the hostname and strips www.', () => {
    expect(getDomainFromUrl('https://www.example.com/path?q=1')).toBe('example.com');
    expect(getDomainFromUrl('https://sub.example.com')).toBe('sub.example.com');
  });

  it('returns the input unchanged when it is not a valid URL', () => {
    expect(getDomainFromUrl('not a url')).toBe('not a url');
  });
});

describe('fetchFavicon', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the Google favicon URL when the HEAD request succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await expect(fetchFavicon('https://example.com')).resolves.toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    );
  });

  it('falls back to DuckDuckGo when Google fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    await expect(fetchFavicon('https://example.com')).resolves.toBe(
      'https://icons.duckduckgo.com/ip3/example.com.ico',
    );
  });

  it('returns null when both services fail', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(fetchFavicon('https://example.com')).resolves.toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(fetchFavicon('https://example.com')).resolves.toBeNull();
  });
});
