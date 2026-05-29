import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSkyblurPost } from '@/hooks/queries/useSkyblurPost';
import { resolveDidToPds } from '@/utils/oauth/discovery';

jest.mock('@/utils/oauth/discovery', () => ({
  resolveDidToPds: jest.fn(),
}));

const SKYBLUR_URL = 'https://skyblur.uk/post/did:plc:abc/rk1';
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
};

beforeEach(() => {
  jest.clearAllMocks();
  (resolveDidToPds as jest.Mock).mockResolvedValue('https://sky.pds');
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('useSkyblurPost query hook', () => {
  it('resolves the PDS and returns the decoded record', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        uri: 'at://did:plc:abc/uk.skyblur.post/rk1',
        cid: 'cid1',
        value: { text: 'my secret', additional: 'more', visibility: 'public' },
      }),
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSkyblurPost(SKYBLUR_URL), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(resolveDidToPds).toHaveBeenCalledWith('did:plc:abc');
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://sky.pds/xrpc/com.atproto.repo.getRecord');
    expect(calledUrl).toContain('collection=uk.skyblur.post');
    expect(result.current.data).toEqual({
      uri: 'at://did:plc:abc/uk.skyblur.post/rk1',
      cid: 'cid1',
      text: 'my secret',
      additional: 'more',
      visibility: 'public',
    });
  });

  it('throws when the fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSkyblurPost(SKYBLUR_URL), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toBe('Skyblur fetch failed: 404');
  });

  it('is disabled when the URL is not a Skyblur post', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSkyblurPost('https://example.com/foo'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is disabled when the URL is null', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSkyblurPost(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
