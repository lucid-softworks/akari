import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { storage } from '@/utils/secureStorage';

const DEFAULT_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';

describe('useSelectedFeed query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  afterEach(() => {
    storage.removeItem('selectedFeed');
  });

  it('returns the default feed when nothing is stored', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSelectedFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(DEFAULT_URI);

    const query = queryClient.getQueryCache().find({ queryKey: ['selectedFeed'] });
    // The query opts out of the persisted cache — MMKV is the source of
    // truth, persisting twice lets stale persisted blobs clobber it.
    expect(query?.meta?.persist).toBe(false);
    expect((query?.options as any)?.staleTime).toBe(Infinity);
    expect(query?.options.gcTime).toBe(Infinity);
  });

  it('reads the persisted choice from MMKV on mount', async () => {
    const customUri = 'at://did:plc:fakebskypartner/app.bsky.feed.generator/sports';
    storage.setItem('selectedFeed', customUri);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSelectedFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(customUri);
  });
});

