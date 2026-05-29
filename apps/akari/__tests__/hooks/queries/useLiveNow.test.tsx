import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLiveNow } from '@/hooks/queries/useLiveNow';

describe('useLiveNow query hook', () => {
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
  });

  afterEach(() => {
    (global.fetch as jest.Mock | undefined)?.mockReset?.();
  });

  it('fetches the live config and returns the liveNow array', async () => {
    const liveNow = [{ did: 'did:plc:abc', domains: ['twitch.tv'] }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ liveNow }),
    }) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLiveNow(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.bsky.app/xrpc/app.bsky.unspecced.getConfig',
      { headers: { 'atproto-proxy': 'did:web:api.bsky.app#bsky_appview' } },
    );
    expect(result.current.data).toEqual(liveNow);
  });

  it('returns an empty array when liveNow is absent from the response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLiveNow(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });

  it('returns an empty array when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ liveNow: [{ did: 'x', domains: [] }] }),
    }) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLiveNow(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });

  it('swallows fetch errors and returns an empty array', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLiveNow(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });
});
