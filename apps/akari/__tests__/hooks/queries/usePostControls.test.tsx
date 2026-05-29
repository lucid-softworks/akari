import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useExistingPostControls } from '@/hooks/queries/usePostControls';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

// The hook constructs its BlueskyApi to read `.baseUrl`, then fetches the
// repo records directly via global fetch.
jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ baseUrl: 'https://pds' })),
}));

const POST_URI = 'at://did:me/app.bsky.feed.post/abc';
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
  (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
  (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('useExistingPostControls query hook', () => {
  it('returns defaults when both records are missing (404)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExistingPostControls(POST_URI), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ replyAllow: { type: 'everyone' }, allowQuote: true });
  });

  it('decodes a limited threadgate and a disabled-quote postgate', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('app.bsky.feed.threadgate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            value: {
              allow: [
                { $type: 'app.bsky.feed.threadgate#followingRule' },
                { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
              ],
            },
          }),
        });
      }
      // postgate disables embedding
      return Promise.resolve({
        ok: true,
        json: async () => ({
          value: { embeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }] },
        }),
      });
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExistingPostControls(POST_URI), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({
      replyAllow: { type: 'limited', following: true, listUris: ['at://list/1'] },
      allowQuote: false,
    });
  });

  it('decodes an empty allow array as nobody', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('threadgate')) {
        return Promise.resolve({ ok: true, json: async () => ({ value: { allow: [] } }) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExistingPostControls(POST_URI), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.replyAllow).toEqual({ type: 'nobody' });
    expect(result.current.data?.allowQuote).toBe(true);
  });

  it('is disabled when the post URI is missing', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useExistingPostControls(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
