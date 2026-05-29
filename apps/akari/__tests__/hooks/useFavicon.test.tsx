import { renderHook, waitFor } from '@testing-library/react-native';

import { useFavicon } from '@/hooks/useFavicon';
import { fetchFavicon, getDomainFromUrl } from '@/utils/faviconUtils';

jest.mock('@/utils/faviconUtils', () => ({
  fetchFavicon: jest.fn(),
  getDomainFromUrl: jest.fn(),
}));

describe('useFavicon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDomainFromUrl as jest.Mock).mockImplementation((url: string) => `domain(${url})`);
  });

  it('fetches and exposes the favicon url for a plain url', async () => {
    (fetchFavicon as jest.Mock).mockResolvedValueOnce('https://favicon.test/icon.png');

    const { result } = renderHook(() => useFavicon('https://example.com'));

    // starts loading immediately
    expect(result.current.isLoading).toBe(true);
    expect(result.current.domain).toBe('domain(https://example.com)');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.faviconUrl).toBe('https://favicon.test/icon.png');
    expect(fetchFavicon).toHaveBeenCalledWith('https://example.com');
  });

  it('does not fetch when an emoji is provided', () => {
    const { result } = renderHook(() => useFavicon('https://example.com', '🔥'));

    expect(fetchFavicon).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.faviconUrl).toBeNull();
  });

  it('treats a whitespace-only emoji as absent and still fetches', async () => {
    (fetchFavicon as jest.Mock).mockResolvedValueOnce('https://favicon.test/icon.png');

    const { result } = renderHook(() => useFavicon('https://example.com', '   '));

    await waitFor(() => {
      expect(result.current.faviconUrl).toBe('https://favicon.test/icon.png');
    });
    expect(fetchFavicon).toHaveBeenCalled();
  });

  it('does not fetch when the url is empty', () => {
    const { result } = renderHook(() => useFavicon(''));

    expect(fetchFavicon).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.faviconUrl).toBeNull();
  });

  it('clears the favicon when the fetch rejects', async () => {
    (fetchFavicon as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useFavicon('https://example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.faviconUrl).toBeNull();
  });

  it('ignores a resolved fetch after the url changes (cancellation)', async () => {
    let resolveFirst: (value: string | null) => void = () => {};
    (fetchFavicon as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce('https://favicon.test/second.png');

    const { result, rerender } = renderHook(({ url }: { url: string }) => useFavicon(url), {
      initialProps: { url: 'https://first.com' },
    });

    // swap url before the first promise resolves
    rerender({ url: 'https://second.com' });

    // resolve the now-cancelled first fetch
    resolveFirst('https://favicon.test/first.png');

    await waitFor(() => {
      expect(result.current.faviconUrl).toBe('https://favicon.test/second.png');
    });
  });
});
