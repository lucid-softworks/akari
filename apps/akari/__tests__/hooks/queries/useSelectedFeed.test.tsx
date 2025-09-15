import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';

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

  it('returns the default feed and persists the query', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSelectedFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const defaultUri =
      'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';
    expect(result.current.data).toBe(defaultUri);

    const fetchResult = await result.current.refetch();
    expect(fetchResult.data).toBe(defaultUri);

    const query = queryClient.getQueryCache().find({ queryKey: ['selectedFeed'] });
    expect(query?.meta?.persist).toBe(true);
    expect(query?.options.staleTime).toBe(Infinity);
    expect(query?.options.gcTime).toBe(Infinity);
  });
});

